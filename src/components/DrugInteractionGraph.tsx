import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Info,
  ShieldAlert,
  Search,
  Maximize2,
  CheckCircle2,
  Pill
} from 'lucide-react';

export interface InteractionNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  class: string;
  isPrimary?: boolean;
  group: 'nsaid' | 'anticoagulant' | 'acei' | 'statin' | 'antiinfective' | 'antiplatelet' | 'antidiabetic' | 'other';
}

export interface InteractionLink extends d3.SimulationLinkDatum<InteractionNode> {
  source: string | InteractionNode;
  target: string | InteractionNode;
  severity: 'major' | 'moderate' | 'minor';
  mechanism: string;
  clinicalImpact: string;
  recommendation: string;
}

interface InteractionNetworkData {
  nodes: InteractionNode[];
  links: InteractionLink[];
}

// Built-in clinical interaction knowledge base
const DRUG_NETWORKS: Record<string, InteractionNetworkData> = {
  warfarin: {
    nodes: [
      { id: 'warfarin', name: 'Warfarin', class: 'Vitamin K Antagonist', isPrimary: true, group: 'anticoagulant' },
      { id: 'aspirin', name: 'Aspirin', class: 'Antiplatelet / NSAID', group: 'antiplatelet' },
      { id: 'ibuprofen', name: 'Ibuprofen', class: 'NSAID', group: 'nsaid' },
      { id: 'amiodarone', name: 'Amiodarone', class: 'Class III Antiarrhythmic', group: 'other' },
      { id: 'fluconazole', name: 'Fluconazole', class: 'Azole Antifungal', group: 'antiinfective' },
      { id: 'ciprofloxacin', name: 'Ciprofloxacin', class: 'Fluoroquinolone', group: 'antiinfective' },
      { id: 'sertraline', name: 'Sertraline', class: 'SSRI', group: 'other' },
      { id: 'atorvastatin', name: 'Atorvastatin', class: 'HMG-CoA Reductase Inhibitor', group: 'statin' },
      { id: 'acetaminophen', name: 'Acetaminophen', class: 'Analgesic', group: 'nsaid' },
    ],
    links: [
      {
        source: 'warfarin',
        target: 'aspirin',
        severity: 'major',
        mechanism: 'Synergistic antihemostatic action + gastric mucosal erosion.',
        clinicalImpact: 'Severe risk of major upper gastrointestinal bleeding and intracranial hemorrhage.',
        recommendation: 'Avoid concurrent use unless strictly indicated (e.g. recent mechanical heart valve). Monitor INR closely.'
      },
      {
        source: 'warfarin',
        target: 'ibuprofen',
        severity: 'major',
        mechanism: 'Platelet inhibition via COX-1 + competitive plasma protein displacement.',
        clinicalImpact: 'Markedly elevated GI ulceration and systemic bleeding risk.',
        recommendation: 'Substitute with acetaminophen or topical analgesics for pain management.'
      },
      {
        source: 'warfarin',
        target: 'amiodarone',
        severity: 'major',
        mechanism: 'Potent inhibition of CYP2C9 and CYP3A4 hepatic clearance.',
        clinicalImpact: 'Supratherapeutic INR spike (often 200-300% increase in warfarin level).',
        recommendation: 'Empirically decrease warfarin dosage by 30%-50% upon starting amiodarone.'
      },
      {
        source: 'warfarin',
        target: 'fluconazole',
        severity: 'major',
        mechanism: 'Strong CYP2C9 enzyme inhibition blocking S-warfarin metabolism.',
        clinicalImpact: 'Rapid accumulation of active warfarin with dangerous INR elevations.',
        recommendation: 'Monitor INR within 48-72 hours of starting fluconazole. Reduce warfarin dose.'
      },
      {
        source: 'warfarin',
        target: 'ciprofloxacin',
        severity: 'major',
        mechanism: 'Displacement from albumin + gut flora alteration reducing endogenous Vitamin K.',
        clinicalImpact: 'Elevated prothrombin time and hemorrhagic tendency.',
        recommendation: 'Frequent INR monitoring during antibiotic course.'
      },
      {
        source: 'warfarin',
        target: 'sertraline',
        severity: 'moderate',
        mechanism: 'Serotonin reuptake blockade impairs platelet aggregation.',
        clinicalImpact: 'Increased risk of bleeding despite normal INR values.',
        recommendation: 'Educate patient on symptoms of occult bleeding (petechiae, melena).'
      },
      {
        source: 'warfarin',
        target: 'acetaminophen',
        severity: 'minor',
        mechanism: 'High-dose acetaminophen (>2g/day) inhibits warfarin metabolism.',
        clinicalImpact: 'Modest increase in INR during prolonged high-dose use.',
        recommendation: 'Limit acetaminophen to <2g/day for patients on chronic warfarin.'
      },
      {
        source: 'aspirin',
        target: 'ibuprofen',
        severity: 'major',
        mechanism: 'Ibuprofen competitively blocks aspirin binding to platelet COX-1 active site.',
        clinicalImpact: 'Loss of cardioprotective antiplatelet effect of aspirin.',
        recommendation: 'Take aspirin at least 30 minutes before or 8 hours after ibuprofen.'
      }
    ]
  },
  ibuprofen: {
    nodes: [
      { id: 'ibuprofen', name: 'Ibuprofen', class: 'NSAID', isPrimary: true, group: 'nsaid' },
      { id: 'lisinopril', name: 'Lisinopril', class: 'ACE Inhibitor', group: 'acei' },
      { id: 'furosemide', name: 'Furosemide', class: 'Loop Diuretic', group: 'other' },
      { id: 'aspirin', name: 'Aspirin', class: 'Antiplatelet', group: 'antiplatelet' },
      { id: 'warfarin', name: 'Warfarin', class: 'Anticoagulant', group: 'anticoagulant' },
      { id: 'lithium', name: 'Lithium', class: 'Mood Stabilizer', group: 'other' },
      { id: 'methotrexate', name: 'Methotrexate', class: 'Antimetabolite', group: 'other' },
      { id: 'spironolactone', name: 'Spironolactone', class: 'Aldosterone Antagonist', group: 'acei' }
    ],
    links: [
      {
        source: 'ibuprofen',
        target: 'lisinopril',
        severity: 'major',
        mechanism: 'NSAID prostaglandin inhibition causes afferent renal arteriolar vasoconstriction while ACEi dilates efferent arteriolar.',
        clinicalImpact: 'Acute decline in GFR (Triple Whammy effect if combined with diuretics) and loss of BP control.',
        recommendation: 'Monitor serum creatinine and blood pressure. Avoid prolonged concurrent use in renal impairment.'
      },
      {
        source: 'ibuprofen',
        target: 'furosemide',
        severity: 'moderate',
        mechanism: 'Inhibition of renal prostaglandins reduces natriuretic and antihypertensive efficacy.',
        clinicalImpact: 'Fluid retention, blunted diuretic response, potential acute kidney injury.',
        recommendation: 'Monitor weight and peripheral edema. Adjust diuretic dose if necessary.'
      },
      {
        source: 'ibuprofen',
        target: 'lithium',
        severity: 'major',
        mechanism: 'Decreased renal prostaglandin synthesis reduces renal lithium clearance.',
        clinicalImpact: 'Lithium toxicity (tremors, ataxia, confusion, seizures).',
        recommendation: 'Avoid NSAID use or reduce lithium dosage with serial serum level monitoring.'
      },
      {
        source: 'ibuprofen',
        target: 'methotrexate',
        severity: 'major',
        mechanism: 'Inhibition of renal tubular secretion of methotrexate.',
        clinicalImpact: 'Severe bone marrow suppression and gastrointestinal toxicity.',
        recommendation: 'Avoid high-dose methotrexate with NSAIDs.'
      },
      {
        source: 'ibuprofen',
        target: 'aspirin',
        severity: 'major',
        mechanism: 'Steric antagonism of COX-1 platelet active site.',
        clinicalImpact: 'Attenuates aspirin cardio-protection.',
        recommendation: 'Space administration timing appropriately.'
      },
      {
        source: 'ibuprofen',
        target: 'warfarin',
        severity: 'major',
        mechanism: 'Direct GI mucosal erosion + platelet functional inhibition.',
        clinicalImpact: 'High incidence of major GI bleeding.',
        recommendation: 'Co-prescribe PPI or avoid combination.'
      }
    ]
  },
  lisinopril: {
    nodes: [
      { id: 'lisinopril', name: 'Lisinopril', class: 'ACE Inhibitor', isPrimary: true, group: 'acei' },
      { id: 'spironolactone', name: 'Spironolactone', class: 'K+-Sparing Diuretic', group: 'acei' },
      { id: 'ibuprofen', name: 'Ibuprofen', class: 'NSAID', group: 'nsaid' },
      { id: 'allopurinol', name: 'Allopurinol', class: 'Xanthine Oxidase Inhibitor', group: 'other' },
      { id: 'losartan', name: 'Losartan', class: 'ARB', group: 'acei' },
      { id: 'metformin', name: 'Metformin', class: 'Biguanide', group: 'antidiabetic' },
      { id: 'sacubitril', name: 'Sacubitril/Valsartan', class: 'ARNI', group: 'acei' }
    ],
    links: [
      {
        source: 'lisinopril',
        target: 'spironolactone',
        severity: 'major',
        mechanism: 'Additive aldosterone inhibition leading to reduced renal potassium excretion.',
        clinicalImpact: 'Severe life-threatening hyperkalemia (K+ > 6.0 mEq/L) and cardiac arrhythmias.',
        recommendation: 'Regularly monitor serum potassium and renal function (eGFR).'
      },
      {
        source: 'lisinopril',
        target: 'sacubitril',
        severity: 'major',
        mechanism: 'Dual inhibition of neprilysin and ACE degrades bradykinin breakdown pathways.',
        clinicalImpact: 'High risk of severe life-threatening angioedema.',
        recommendation: 'Contraindicated! Require a 36-hour washout period when switching from ACEi to ARNI.'
      },
      {
        source: 'lisinopril',
        target: 'ibuprofen',
        severity: 'major',
        mechanism: 'Renal hemodynamics impairment (afferent constriction + efferent dilation).',
        clinicalImpact: 'Pre-renal acute kidney injury.',
        recommendation: 'Hydrate well and monitor serum creatinine.'
      },
      {
        source: 'lisinopril',
        target: 'allopurinol',
        severity: 'moderate',
        mechanism: 'Hypersensitivity reaction synergy.',
        clinicalImpact: 'Increased incidence of Steven-Johnson syndrome or anaphylaxis.',
        recommendation: 'Monitor for rash and systemic hypersensitivity symptoms.'
      },
      {
        source: 'lisinopril',
        target: 'losartan',
        severity: 'major',
        mechanism: 'Dual renin-angiotensin-aldosterone system (RAAS) blockade.',
        clinicalImpact: 'Increased hypotension, syncope, hyperkalemia, and renal failure without added survival benefit.',
        recommendation: 'Avoid combination of ACEi + ARB in heart failure or diabetic nephropathy.'
      }
    ]
  },
  metformin: {
    nodes: [
      { id: 'metformin', name: 'Metformin', class: 'Biguanide', isPrimary: true, group: 'antidiabetic' },
      { id: 'contrast', name: 'Iodinated Contrast', class: 'Radiocontrast Agent', group: 'other' },
      { id: 'alcohol', name: 'Ethanol / Alcohol', class: 'CNS Depressant', group: 'other' },
      { id: 'cimetidine', name: 'Cimetidine', class: 'H2 Blocker', group: 'other' },
      { id: 'furosemide', name: 'Furosemide', class: 'Loop Diuretic', group: 'other' },
      { id: 'lisinopril', name: 'Lisinopril', class: 'ACE Inhibitor', group: 'acei' }
    ],
    links: [
      {
        source: 'metformin',
        target: 'contrast',
        severity: 'major',
        mechanism: 'Contrast-induced acute kidney injury leads to metformin accumulation.',
        clinicalImpact: 'Severe, life-threatening lactic acidosis.',
        recommendation: 'Withhold metformin at the time of or prior to iodinated contrast procedures in eGFR 30-60. Recheck eGFR 48 hrs post-procedure.'
      },
      {
        source: 'metformin',
        target: 'alcohol',
        severity: 'major',
        mechanism: 'Potentiates metformin effect on lactate metabolism in liver + impairs gluconeogenesis.',
        clinicalImpact: 'Severe hypoglycemia and elevated risk of lactic acidosis.',
        recommendation: 'Warn patients against excessive acute or chronic alcohol consumption.'
      },
      {
        source: 'metformin',
        target: 'cimetidine',
        severity: 'moderate',
        mechanism: 'Inhibition of organic cation transporter (OCT2) reduces renal elimination.',
        clinicalImpact: 'Increased plasma metformin concentrations by up to 50%.',
        recommendation: 'Consider alternative H2 blocker (e.g. famotidine).'
      },
      {
        source: 'metformin',
        target: 'furosemide',
        severity: 'moderate',
        mechanism: 'Furosemide increases metformin Cmax without changing renal clearance.',
        clinicalImpact: 'Potential enhancement of metformin efficacy or lactic acidosis risk in dehydration.',
        recommendation: 'Ensure adequate fluid hydration status.'
      }
    ]
  }
};

export function DrugInteractionGraph({ initialDrug = 'Warfarin' }: { initialDrug?: string }) {
  const [selectedAgent, setSelectedAgent] = useState<string>(initialDrug.toLowerCase());
  const [severityFilter, setSeverityFilter] = useState<'all' | 'major' | 'moderate' | 'minor'>('all');
  const [selectedLink, setSelectedLink] = useState<InteractionLink | null>(null);
  const [selectedNode, setSelectedNode] = useState<InteractionNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Active network dataset based on selected drug or fallback
  const activeNetwork = useMemo(() => {
    const key = selectedAgent.toLowerCase();
    if (DRUG_NETWORKS[key]) {
      return DRUG_NETWORKS[key];
    }
    // Search in existing keys
    const match = Object.keys(DRUG_NETWORKS).find(k => k.includes(key) || key.includes(k));
    if (match) return DRUG_NETWORKS[match];

    // Fallback to Warfarin
    return DRUG_NETWORKS.warfarin;
  }, [selectedAgent]);

  // Filtered links and nodes based on severity & search
  const filteredData = useMemo(() => {
    let links = activeNetwork.links;
    if (severityFilter !== 'all') {
      links = links.filter(l => l.severity === severityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      links = links.filter(l => {
        const srcName = typeof l.source === 'object' ? l.source.name : l.source;
        const tgtName = typeof l.target === 'object' ? l.target.name : l.target;
        return (
          srcName.toLowerCase().includes(q) ||
          tgtName.toLowerCase().includes(q) ||
          l.mechanism.toLowerCase().includes(q)
        );
      });
    }

    // Collect involved nodes
    const nodeIds = new Set<string>();
    links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      nodeIds.add(srcId);
      nodeIds.add(tgtId);
    });

    // Always include primary node
    const primary = activeNetwork.nodes.find(n => n.isPrimary);
    if (primary) nodeIds.add(primary.id);

    const nodes = activeNetwork.nodes
      .filter(n => nodeIds.has(n.id))
      .map(n => ({ ...n })); // clone for d3 simulation

    const clonedLinks = links.map(l => ({ ...l }));

    return { nodes, links: clonedLinks };
  }, [activeNetwork, severityFilter, searchQuery]);

  // Render D3 Graph
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = 460;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear previous render

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create container group for Zooming
    const g = svg.append('g').attr('class', 'graph-container');

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // D3 Force Simulation setup
    const simulation = d3
      .forceSimulation<InteractionNode>(filteredData.nodes)
      .force(
        'link',
        d3
          .forceLink<InteractionNode, InteractionLink>(filteredData.links)
          .id(d => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(38));

    // Render Links
    const link = g
      .append('g')
      .attr('stroke-opacity', 0.8)
      .selectAll<SVGLineElement, InteractionLink>('line')
      .data(filteredData.links)
      .join('line')
      .attr('stroke', (d: InteractionLink) => {
        if (d.severity === 'major') return '#E11D48'; // Rose
        if (d.severity === 'moderate') return '#F59E0B'; // Amber
        return '#3B82F6'; // Blue
      })
      .attr('stroke-width', (d: InteractionLink) => (d.severity === 'major' ? 3.5 : d.severity === 'moderate' ? 2.5 : 1.8))
      .attr('stroke-dasharray', (d: InteractionLink) => (d.severity === 'minor' ? '4,4' : 'none'))
      .attr('class', 'cursor-pointer transition-opacity hover:opacity-100')
      .on('click', (event: MouseEvent, d: InteractionLink) => {
        event.stopPropagation();
        setSelectedLink(d);
        setSelectedNode(null);
      });

    // Render Nodes Group
    const node = g
      .append('g')
      .selectAll<SVGGElement, InteractionNode>('g')
      .data(filteredData.nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .call(
        d3
          .drag<SVGGElement, InteractionNode>()
          .on('start', (event, d: InteractionNode) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d: InteractionNode) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d: InteractionNode) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event: MouseEvent, d: InteractionNode) => {
        event.stopPropagation();
        setSelectedNode(d);
        // Find links associated with this node
        const relatedLink = filteredData.links.find(
          l =>
            (typeof l.source === 'object' ? (l.source as InteractionNode).id === d.id : l.source === d.id) ||
            (typeof l.target === 'object' ? (l.target as InteractionNode).id === d.id : l.target === d.id)
        );
        if (relatedLink) setSelectedLink(relatedLink);
      });

    // Node Circle
    node
      .append('circle')
      .attr('r', (d: InteractionNode) => (d.isPrimary ? 24 : 18))
      .attr('fill', (d: InteractionNode) => {
        if (d.isPrimary) return '#0F172A'; // Slate dark
        if (d.group === 'nsaid') return '#3B82F6';
        if (d.group === 'anticoagulant') return '#E11D48';
        if (d.group === 'acei') return '#10B981';
        if (d.group === 'antiinfective') return '#8B5CF6';
        return '#64748B';
      })
      .attr('stroke', (d: InteractionNode) => (d.isPrimary ? '#38BDF8' : '#FFFFFF'))
      .attr('stroke-width', (d: InteractionNode) => (d.isPrimary ? 3.5 : 2))
      .attr('class', 'shadow-lg transition-transform hover:scale-110');

    // Node Text Label
    node
      .append('text')
      .text((d: InteractionNode) => d.name)
      .attr('x', 0)
      .attr('y', (d: InteractionNode) => (d.isPrimary ? 36 : 30))
      .attr('text-anchor', 'middle')
      .attr('fill', '#0F172A')
      .attr('font-size', (d: InteractionNode) => (d.isPrimary ? '12px' : '10px'))
      .attr('font-weight', (d: InteractionNode) => (d.isPrimary ? '800' : '600'))
      .attr('pointer-events', 'none')
      .attr('class', 'select-none drop-shadow-xs');

    // Ticker loop
    simulation.on('tick', () => {
      link
        .attr('x1', (d: InteractionLink) => (d.source as InteractionNode).x || 0)
        .attr('y1', (d: InteractionLink) => (d.source as InteractionNode).y || 0)
        .attr('x2', (d: InteractionLink) => (d.target as InteractionNode).x || 0)
        .attr('y2', (d: InteractionLink) => (d.target as InteractionNode).y || 0);

      node.attr('transform', (d: InteractionNode) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData]);

  // Zoom control helpers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="bg-white/85 backdrop-blur-xl border border-white/60 rounded-xl p-4 shadow-sm space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Network className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              D3 Force-Directed Drug Interaction Network
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Interactive topological view of pharmacodynamic & pharmacokinetic drug-drug interactions.
          </p>
        </div>

        {/* Primary Agent Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Agent:</span>
          {['warfarin', 'ibuprofen', 'lisinopril', 'metformin'].map(drug => (
            <button
              key={drug}
              onClick={() => {
                setSelectedAgent(drug);
                setSelectedLink(null);
                setSelectedNode(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                selectedAgent.toLowerCase() === drug
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {drug}
            </button>
          ))}
        </div>
      </div>

      {/* Control Bar: Severity Filters & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Severity:</span>
          {[
            { id: 'all', label: 'All', color: 'bg-slate-200 text-slate-800' },
            { id: 'major', label: 'Major (Red)', color: 'bg-rose-100 text-rose-800' },
            { id: 'moderate', label: 'Moderate (Amber)', color: 'bg-amber-100 text-amber-800' },
            { id: 'minor', label: 'Minor (Blue)', color: 'bg-blue-100 text-blue-800' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSeverityFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                severityFilter === f.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Zoom Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 text-xs shadow-2xs"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 text-xs shadow-2xs"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 text-xs shadow-2xs"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main D3 Canvas Area */}
      <div ref={containerRef} className="relative bg-slate-900/95 rounded-xl border border-slate-800 overflow-hidden shadow-inner min-h-[460px]">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#38BDF8 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <svg ref={svgRef} className="w-full h-[460px] cursor-grab active:cursor-grabbing" />

        {/* Helper Hint */}
        <div className="absolute top-3 left-3 bg-slate-800/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-md text-[10px] text-slate-300 flex items-center gap-1.5 pointer-events-none">
          <Info className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>Drag nodes to reposition • Scroll or Pinch to Zoom • Click node or line for clinical details</span>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg text-[10px] text-slate-300 space-y-1">
          <div className="font-bold text-slate-200 mb-1 border-b border-slate-800 pb-0.5">Interaction Severity</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-rose-500 rounded-full inline-block" />
            <span>Major Risk (Severe)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-amber-500 rounded-full inline-block" />
            <span>Moderate (Monitor)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-blue-500 rounded-full inline-block" />
            <span>Minor / Synergistic</span>
          </div>
        </div>
      </div>

      {/* Inspector Panel for Selected Node / Link */}
      {(selectedLink || selectedNode) && (
        <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-md animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold tracking-wide uppercase text-slate-200">
                Clinical Interaction Inspector
              </h4>
            </div>
            {selectedLink && (
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  selectedLink.severity === 'major'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : selectedLink.severity === 'moderate'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
              >
                {selectedLink.severity} Interaction
              </span>
            )}
          </div>

          {selectedLink ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Agents Involved</div>
                <div className="font-bold text-cyan-300 text-sm">
                  {typeof selectedLink.source === 'object' ? selectedLink.source.name : selectedLink.source} +{' '}
                  {typeof selectedLink.target === 'object' ? selectedLink.target.name : selectedLink.target}
                </div>
              </div>

              <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60 md:col-span-2 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Pharmacodynamic / CYP Mechanism</div>
                <p className="text-slate-200 leading-normal">{selectedLink.mechanism}</p>
              </div>

              <div className="p-2.5 bg-rose-950/40 rounded-lg border border-rose-800/50 text-rose-200 md:col-span-3 space-y-1">
                <div className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Clinical Impact & Risk
                </div>
                <p className="leading-relaxed">{selectedLink.clinicalImpact}</p>
              </div>

              <div className="p-2.5 bg-emerald-950/40 rounded-lg border border-emerald-800/50 text-emerald-200 md:col-span-3 space-y-1">
                <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Management Strategy
                </div>
                <p className="leading-relaxed">{selectedLink.recommendation}</p>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-xs space-y-1">
              <div className="font-bold text-sm text-cyan-300">{selectedNode.name}</div>
              <div className="text-slate-400">Class: {selectedNode.class}</div>
              <p className="text-slate-300 mt-2">
                Click any connecting force line on the graph above to view detailed interaction pathways, CYP enzymes, and clinical management guidelines for {selectedNode.name}.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
