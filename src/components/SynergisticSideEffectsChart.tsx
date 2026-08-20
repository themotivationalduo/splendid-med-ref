import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Activity,
  Layers,
  Filter,
  SlidersHorizontal,
  Flame,
  Pill,
  HeartPulse,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

export interface SynergisticSideEffectsChartProps {
  drugList: string[];
}

export interface DrugSideEffectScore {
  drugKey: string;
  drugName: string;
  score: number; // 1 to 10
  color: string;
  mechanism: string;
}

export interface SideEffectCategory {
  id: string;
  title: string;
  category: string;
  description: string;
  clinicalMitigation: string;
  iconSymbol: string;
  baselineThreshold: number;
}

// Standardized Side Effect Categories
export const SIDE_EFFECT_CATEGORIES: SideEffectCategory[] = [
  {
    id: 'gi_bleed',
    title: 'GI Bleeding & Ulceration',
    category: 'Gastrointestinal',
    description: 'Synergistic gastric mucosal erosion and COX-1 mediated platelet inhibition.',
    clinicalMitigation: 'Co-prescribe a Proton Pump Inhibitor (e.g., Omeprazole 20mg daily). Consider swapping NSAID for Acetaminophen.',
    iconSymbol: '🩸',
    baselineThreshold: 5.0
  },
  {
    id: 'aki_nephro',
    title: 'Acute Kidney Injury (Nephrotoxicity)',
    category: 'Renal / Metabolic',
    description: 'Impaired afferent arteriolar vasodilation (NSAIDs) coupled with efferent dilation (ACEi/ARB) reducing GFR.',
    clinicalMitigation: 'Monitor baseline serum creatinine and eGFR within 7-14 days. Ensure adequate hydration. Avoid triple therapy.',
    iconSymbol: '🧪',
    baselineThreshold: 6.0
  },
  {
    id: 'hyperkalemia',
    title: 'Severe Hyperkalemia Risk',
    category: 'Electrolyte',
    description: 'Suppressed aldosterone release and reduced renal distal tubule potassium excretion.',
    clinicalMitigation: 'Order serum potassium level within 5-7 days. Instruct patient on low-potassium diet. Avoid K+ supplements.',
    iconSymbol: '⚡',
    baselineThreshold: 5.5
  },
  {
    id: 'hypotension',
    title: 'Profound Hypotension & Syncope',
    category: 'Cardiovascular',
    description: 'Combined systemic vasodilation, preload reduction, and cardiac output dampening.',
    clinicalMitigation: 'Advise orthostatic precautions. Stagger dosing times between antihypertensives. Monitor seated/standing BP.',
    iconSymbol: '📉',
    baselineThreshold: 6.0
  },
  {
    id: 'hepatotoxicity',
    title: 'Hepatotoxicity & Transaminitis',
    category: 'Hepatic',
    description: 'Cumulative CYP enzyme metabolic burden, toxic metabolite buildup (NAPQI), or direct hepatocellular stress.',
    clinicalMitigation: 'Obtain baseline LFTs (ALT, AST, Total Bilirubin). Instruct patient to avoid alcohol and monitor for jaundice.',
    iconSymbol: '🫀',
    baselineThreshold: 5.0
  },
  {
    id: 'qt_prolongation',
    title: 'QTc Prolongation & Torsades',
    category: 'Cardiovascular',
    description: 'Additive cardiac hERG potassium channel blockade delaying ventricular repolarization.',
    clinicalMitigation: 'Obtain baseline 12-lead ECG. Correct hypokalemia/hypomagnesemia. Discontinue if QTc > 500 ms.',
    iconSymbol: '❤️‍🔥',
    baselineThreshold: 6.0
  },
  {
    id: 'myopathy',
    title: 'Myopathy & Rhabdomyolysis',
    category: 'Musculoskeletal',
    description: 'CYP3A4 inhibition escalating statin plasma concentration, leading to skeletal muscle necrosis.',
    clinicalMitigation: 'Check serum Creatine Kinase (CK) if muscle pain occurs. Temporarily hold statin if CK > 5x ULN.',
    iconSymbol: '💪',
    baselineThreshold: 5.5
  },
  {
    id: 'cns_sedation',
    title: 'CNS Sedation & Respiratory Depression',
    category: 'Neurological',
    description: 'Synergistic central nervous system gamma-aminobutyric acid or opioid receptor activation.',
    clinicalMitigation: 'Warn against driving or operating machinery. Avoid co-administration with ethanol or sedative-hypnotics.',
    iconSymbol: '🧠',
    baselineThreshold: 6.0
  },
  {
    id: 'thrombocytopenia',
    title: 'Thrombocytopenia & Bleeding Hazard',
    category: 'Hematologic',
    description: 'Direct bone marrow megakaryocyte suppression combined with systemic antiplatelet activity.',
    clinicalMitigation: 'Order CBC with differential. Educate patient to report petechiae, epistaxis, or easy bruising immediately.',
    iconSymbol: '🩺',
    baselineThreshold: 5.0
  },
  {
    id: 'hypoglycemia',
    title: 'Severe Hypoglycemia',
    category: 'Endocrine',
    description: 'Enhanced insulin sensitivity paired with exogenous insulin or sulfonylurea release.',
    clinicalMitigation: 'Prescribe fast-acting oral glucose and glucagon nasal spray. Frequent fingerstick capillary glucose checks.',
    iconSymbol: '🍬',
    baselineThreshold: 6.0
  }
];

// Drug Color Palette for Chart Rendering
const DRUG_COLORS: Record<string, string> = {
  warfarin: '#F43F5E',      // Rose Red
  aspirin: '#F59E0B',       // Amber
  ibuprofen: '#EF4444',     // Red
  naproxen: '#DC2626',      // Dark Red
  lisinopril: '#3B82F6',    // Blue
  losartan: '#2563EB',      // Deep Blue
  spironolactone: '#8B5CF6',// Purple
  furosemide: '#06B6D4',    // Cyan
  sacubitril: '#6366F1',    // Indigo
  metformin: '#10B981',     // Emerald
  insulin: '#059669',       // Green
  atorvastatin: '#EC4899',  // Pink
  simvastatin: '#DB2777',   // Dark Pink
  amiodarone: '#D97706',    // Orange Amber
  fluconazole: '#14B8A6',   // Teal
  ciprofloxacin: '#0284C7', // Sky Blue
  clarithromycin: '#0EA5E9',// Light Sky
  sertraline: '#A855F7',    // Bright Purple
  acetaminophen: '#84CC16', // Lime Green
  clopidogrel: '#EAB308',   // Yellow
  omeprazole: '#64748B',    // Slate
  digoxin: '#B45309',       // Amber Brown
  lithium: '#7C3AED',       // Violet
  methotrexate: '#991B1B',  // Crimson Dark
  allopurinol: '#047857',   // Dark Emerald
  contrast: '#475569',     // Slate Dark
  alcohol: '#E11D48',      // Rose Accent
  nitroglycerin: '#F97316',// Bright Orange
  sildenafil: '#FA5252',   // Coral Red
  tramadol: '#9333EA',     // Purple
  tizanidine: '#C026D3',   // Fuchsia
  verapamil: '#0284C7',    // Sky
  diltiazem: '#0369A1'     // Deep Sky
};

function getDrugColor(drugKey: string, index: number): string {
  const norm = drugKey.toLowerCase().trim();
  if (DRUG_COLORS[norm]) return DRUG_COLORS[norm];
  const fallbackColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
  return fallbackColors[index % fallbackColors.length];
}

// Side Effect Profile Registry per Drug
const DRUG_SIDE_EFFECT_PROFILES: Record<string, Record<string, { score: number; mechanism: string }>> = {
  warfarin: {
    gi_bleed: { score: 8.5, mechanism: 'Vitamin K epoxide reductase inhibition impairs clotting factors II, VII, IX, X.' },
    thrombocytopenia: { score: 7.0, mechanism: 'High hazard ratio for systemic hemorrhage.' }
  },
  aspirin: {
    gi_bleed: { score: 7.5, mechanism: 'Irreversible COX-1 inhibition causes direct gastric epithelial erosions.' },
    aki_nephro: { score: 4.0, mechanism: 'Renal prostaglandin synthesis suppression.' },
    thrombocytopenia: { score: 6.5, mechanism: 'Irreversible platelet aggregation blockade.' }
  },
  ibuprofen: {
    gi_bleed: { score: 8.0, mechanism: 'Competitive COX-1/COX-2 inhibition depletes protective gastric mucin.' },
    aki_nephro: { score: 7.5, mechanism: 'Inhibits renal prostaglandin-mediated afferent arteriolar vasodilation.' },
    hyperkalemia: { score: 4.5, mechanism: 'Hyporeninemic hypoaldosteronism induced by COX inhibition.' }
  },
  naproxen: {
    gi_bleed: { score: 8.0, mechanism: 'Non-selective COX inhibitor with high GI mucosal ulceration potential.' },
    aki_nephro: { score: 7.5, mechanism: 'Decreases renal perfusion and GFR in susceptible patients.' },
    hyperkalemia: { score: 4.5, mechanism: 'Reduces distal tubule potassium excretion.' }
  },
  lisinopril: {
    aki_nephro: { score: 5.5, mechanism: 'Efferent arteriolar dilation reduces glomerular filtration pressure.' },
    hyperkalemia: { score: 8.0, mechanism: 'Blocks Angiotensin II, suppressing adrenal aldosterone synthesis.' },
    hypotension: { score: 6.5, mechanism: 'Systemic arterial vasodilation.' }
  },
  losartan: {
    aki_nephro: { score: 5.0, mechanism: 'AT1 receptor blockade reduces glomerular capillary hydraulic pressure.' },
    hyperkalemia: { score: 7.5, mechanism: 'Inhibits aldosterone-mediated Na+/K+ exchange in renal collecting duct.' },
    hypotension: { score: 6.0, mechanism: 'Arterial smooth muscle relaxation.' }
  },
  spironolactone: {
    hyperkalemia: { score: 9.5, mechanism: 'Direct competitive antagonist of mineralocorticoid receptors in principal cells.' },
    hypotension: { score: 5.0, mechanism: 'Natriuretic volume contraction.' },
    aki_nephro: { score: 4.5, mechanism: 'Volume depletion reducing renal perfusion.' }
  },
  furosemide: {
    aki_nephro: { score: 6.0, mechanism: 'Prerenal azotemia secondary to intense intravascular volume contraction.' },
    hypotension: { score: 6.5, mechanism: 'Rapid venodilation and diuresis reducing cardiac preload.' }
  },
  sacubitril: {
    hypotension: { score: 8.5, mechanism: 'Neprilysin inhibition raises natriuretic peptides + ARB vasodilation.' },
    hyperkalemia: { score: 7.0, mechanism: 'RAAS blockade suppresses renal K+ excretion.' },
    aki_nephro: { score: 5.0, mechanism: 'Glomerular hemodynamics modification.' }
  },
  metformin: {
    hypoglycemia: { score: 3.0, mechanism: 'Inhibits hepatic gluconeogenesis (low risk solo, higher with insulin).' }
  },
  insulin: {
    hypoglycemia: { score: 9.5, mechanism: 'Direct acceleration of peripheral glucose uptake and glycogen storage.' }
  },
  atorvastatin: {
    hepatotoxicity: { score: 5.5, mechanism: 'HMG-CoA reductase inhibition can cause transient transaminase elevations.' },
    myopathy: { score: 6.0, mechanism: 'Mitochondrial dysfunction in skeletal muscle cells.' }
  },
  simvastatin: {
    hepatotoxicity: { score: 6.0, mechanism: 'Hepatic enzyme elevation.' },
    myopathy: { score: 7.5, mechanism: 'Dose-dependent myotoxicity, exacerbated by CYP3A4 inhibitors.' }
  },
  amiodarone: {
    qt_prolongation: { score: 9.0, mechanism: 'Class III antiarrhythmic blocking IKr delayed rectifier potassium current.' },
    hepatotoxicity: { score: 8.0, mechanism: 'Lipophilic accumulation in hepatocytes leading to lysosomal phospholipidosis.' },
    myopathy: { score: 5.0, mechanism: 'CYP3A4/P-gp inhibitor that spikes statin plasma exposure.' }
  },
  fluconazole: {
    qt_prolongation: { score: 6.5, mechanism: 'Inhibits cardiac hERG K+ channels.' },
    hepatotoxicity: { score: 7.5, mechanism: 'Strong hepatic CYP enzyme inhibitor causing hepatocellular injury.' }
  },
  ciprofloxacin: {
    qt_prolongation: { score: 7.0, mechanism: 'Fluoroquinolone hERG channel blockade.' },
    aki_nephro: { score: 4.5, mechanism: 'Crystalluria and acute interstitial nephritis.' }
  },
  clarithromycin: {
    qt_prolongation: { score: 7.5, mechanism: 'Macrolide prolongation of cardiac action potential duration.' },
    hepatotoxicity: { score: 5.0, mechanism: 'Cholestatic jaundice and hepatic impairment.' }
  },
  sertraline: {
    gi_bleed: { score: 3.5, mechanism: 'Platelet serotonin depletion impairs dense granule release during aggregation.' },
    cns_sedation: { score: 4.5, mechanism: 'Central serotonergic modulation.' }
  },
  acetaminophen: {
    hepatotoxicity: { score: 6.5, mechanism: 'NAPQI reactive metabolite generation depletes hepatic glutathione.' }
  },
  clopidogrel: {
    gi_bleed: { score: 5.5, mechanism: 'P2Y12 receptor blockade prevents ADP-induced platelet aggregation.' },
    thrombocytopenia: { score: 6.0, mechanism: 'Antiplatelet therapy elevating mucosal bleed hazard.' }
  },
  nitroglycerin: {
    hypotension: { score: 9.0, mechanism: 'cGMP-mediated vascular smooth muscle relaxation and severe venodilation.' }
  },
  tramadol: {
    cns_sedation: { score: 8.0, mechanism: 'Mu-opioid agonist and monoamine reuptake inhibitor causing CNS depression.' }
  },
  tizanidine: {
    cns_sedation: { score: 9.0, mechanism: 'Central Alpha-2 adrenergic agonist causing pronounced sedation and dry mouth.' },
    hypotension: { score: 7.0, mechanism: 'Reduces sympathetic outflow from the CNS.' }
  },
  verapamil: {
    hypotension: { score: 6.5, mechanism: 'L-type calcium channel blocker in vascular smooth muscle and AV node.' },
    myopathy: { score: 4.5, mechanism: 'CYP3A4 inhibition increases statin levels.' }
  },
  methotrexate: {
    aki_nephro: { score: 8.5, mechanism: 'Direct renal tubular precipitation and acute tubular necrosis.' },
    hepatotoxicity: { score: 8.0, mechanism: 'Hepatic fibrosis and transaminitis.' },
    thrombocytopenia: { score: 8.5, mechanism: 'Dihydrofolate reductase inhibition causes severe bone marrow suppression.' }
  }
};

export function SynergisticSideEffectsChart({ drugList }: SynergisticSideEffectsChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [filterSynergisticOnly, setFilterSynergisticOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'score' | 'count'>('score');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>('gi_bleed');
  const [hoveredDrug, setHoveredDrug] = useState<string | null>(null);

  // Parse and calculate synergistic toxicity profiles
  const processedData = useMemo(() => {
    if (!drugList || drugList.length === 0) return [];

    const normList = drugList.map(d => d.toLowerCase().trim());

    return SIDE_EFFECT_CATEGORIES.map(cat => {
      const contributingDrugs: DrugSideEffectScore[] = [];

      normList.forEach((drugKey, idx) => {
        const profile = DRUG_SIDE_EFFECT_PROFILES[drugKey];
        if (profile && profile[cat.id]) {
          const formattedName = drugKey.charAt(0).toUpperCase() + drugKey.slice(1);
          contributingDrugs.push({
            drugKey,
            drugName: formattedName,
            score: profile[cat.id].score,
            color: getDrugColor(drugKey, idx),
            mechanism: profile[cat.id].mechanism
          });
        }
      });

      const count = contributingDrugs.length;
      const rawSumScore = contributingDrugs.reduce((acc, curr) => acc + curr.score, 0);

      // Synergistic Multiplier: 1 + 0.35 * (count - 1) when count >= 2
      const synergyMultiplier = count >= 2 ? Math.round((1 + 0.35 * (count - 1)) * 100) / 100 : 1.0;
      const totalSynergisticScore = Math.round(rawSumScore * synergyMultiplier * 10) / 10;
      const isSynergistic = count >= 2;

      return {
        ...cat,
        contributingDrugs,
        count,
        rawSumScore: Math.round(rawSumScore * 10) / 10,
        synergyMultiplier,
        totalSynergisticScore,
        isSynergistic
      };
    })
    .filter(item => item.count > 0)
    .filter(item => (filterSynergisticOnly ? item.isSynergistic : true))
    .sort((a, b) => {
      if (sortBy === 'score') {
        return b.totalSynergisticScore - a.totalSynergisticScore;
      }
      return b.count - a.count;
    });
  }, [drugList, filterSynergisticOnly, sortBy]);

  // Selected Category Object
  const selectedCategoryData = useMemo(() => {
    if (!selectedCategoryId) return processedData[0] || null;
    return processedData.find(d => d.id === selectedCategoryId) || processedData[0] || null;
  }, [processedData, selectedCategoryId]);

  // Render D3 Stacked Comparative Bar Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || processedData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 700;
    const barHeight = 42;
    const marginTop = 25;
    const marginRight = 120;
    const marginBottom = 30;
    const marginLeft = 185;
    const height = Math.max(340, processedData.length * barHeight + marginTop + marginBottom);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

    // Compute maximum score scale
    const maxVal = d3.max(processedData, (d: { totalSynergisticScore: number }) => d.totalSynergisticScore);
    const maxScore = Math.max(25, typeof maxVal === 'number' ? maxVal : 25);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, maxScore])
      .range([marginLeft, width - marginRight]);

    const yScale = d3.scaleBand()
      .domain(processedData.map(d => d.id))
      .range([marginTop, height - marginBottom])
      .padding(0.28);

    // Gridlines background
    const xTicks = xScale.ticks(6);
    const gridGroup = svg.append('g').attr('class', 'gridlines');

    xTicks.forEach(tick => {
      gridGroup.append('line')
        .attr('x1', xScale(tick))
        .attr('x2', xScale(tick))
        .attr('y1', marginTop)
        .attr('y2', height - marginBottom)
        .attr('stroke', '#1E293B')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

      gridGroup.append('text')
        .attr('x', xScale(tick))
        .attr('y', height - marginBottom + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748B')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text(`${tick} pts`);
    });

    // Render Bars
    processedData.forEach(item => {
      const y = yScale(item.id) || 0;
      const h = yScale.bandwidth();

      const rowG = svg.append('g')
        .attr('class', 'bar-row')
        .style('cursor', 'pointer')
        .on('click', () => setSelectedCategoryId(item.id));

      // Category Label Left
      const labelG = rowG.append('g').attr('transform', `translate(${marginLeft - 10}, ${y + h / 2})`);

      labelG.append('text')
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', item.id === selectedCategoryId ? '#38BDF8' : '#F8FAFC')
        .attr('font-size', '12px')
        .attr('font-weight', item.id === selectedCategoryId ? '800' : '600')
        .text(`${item.iconSymbol} ${item.title}`);

      labelG.append('text')
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('y', 14)
        .attr('fill', '#64748B')
        .attr('font-size', '9px')
        .text(`${item.count} drug${item.count > 1 ? 's' : ''} contributing`);

      // Stacked Bar Segments for Contributing Drugs
      let cumulativeX = marginLeft;

      item.contributingDrugs.forEach((drug) => {
        const segWidth = (drug.score / maxScore) * (width - marginLeft - marginRight);
        const isHovered = hoveredDrug === drug.drugKey;

        // Render Drug Rect Segment
        rowG.append('rect')
          .attr('x', cumulativeX)
          .attr('y', y)
          .attr('width', 0) // Start 0 for animation
          .attr('height', h)
          .attr('rx', 4)
          .attr('fill', drug.color)
          .attr('opacity', isHovered ? 1 : 0.88)
          .attr('stroke', isHovered ? '#FFFFFF' : '#0F172A')
          .attr('stroke-width', isHovered ? 2 : 1)
          .on('mouseenter', () => setHoveredDrug(drug.drugKey))
          .on('mouseleave', () => setHoveredDrug(null))
          .transition()
          .duration(600)
          .attr('width', Math.max(4, segWidth));

        // Drug Initial Text Label inside segment if width permits
        if (segWidth > 28) {
          rowG.append('text')
            .attr('x', cumulativeX + segWidth / 2)
            .attr('y', y + h / 2 + 1)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#FFFFFF')
            .attr('font-size', '10px')
            .attr('font-weight', '700')
            .attr('pointer-events', 'none')
            .text(drug.drugName.substring(0, 5));
        }

        cumulativeX += segWidth;
      });

      // Total Score & Synergy Multiplier Badge at End of Bar
      const totalBarWidth = xScale(item.totalSynergisticScore) - marginLeft;
      const endX = marginLeft + totalBarWidth;

      const badgeG = rowG.append('g')
        .attr('transform', `translate(${endX + 8}, ${y + h / 2})`);

      if (item.isSynergistic) {
        // Glowing Synergy Warning Tag
        badgeG.append('rect')
          .attr('x', 0)
          .attr('y', -10)
          .attr('width', 88)
          .attr('height', 20)
          .attr('rx', 10)
          .attr('fill', '#EF4444')
          .attr('opacity', 0.25)
          .attr('stroke', '#F87171')
          .attr('stroke-width', 1);

        badgeG.append('text')
          .attr('x', 44)
          .attr('y', 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#FCA5A5')
          .attr('font-size', '10px')
          .attr('font-weight', '800')
          .text(`⚠️ ${item.synergyMultiplier}x Synergy`);
      } else {
        // Standard Score Badge
        badgeG.append('text')
          .attr('x', 0)
          .attr('y', 2)
          .attr('text-anchor', 'start')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#94A3B8')
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text(`${item.totalSynergisticScore} pts`);
      }
    });

  }, [processedData, selectedCategoryId, hoveredDrug]);

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 space-y-4 shadow-xl">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Synergistic Side Effect Toxicity Matrix (D3 Visualizer)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Comparative bar chart quantifying additive and synergistic pharmacodynamic toxicities across active polypharmacy agents.
          </p>
        </div>

        {/* View Controls & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Synergistic Overlaps Only */}
          <button
            onClick={() => setFilterSynergisticOnly(!filterSynergisticOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
              filterSynergisticOnly
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {filterSynergisticOnly ? 'Synergistic Overlaps (≥2 Drugs)' : 'All Side Effects'}
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-cyan-400" /> Sort:
            </span>
            <button
              onClick={() => setSortBy('score')}
              className={`px-2 py-1 rounded font-bold transition-colors ${
                sortBy === 'score' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Risk Score
            </button>
            <button
              onClick={() => setSortBy('count')}
              className={`px-2 py-1 rounded font-bold transition-colors ${
                sortBy === 'count' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Drug Count
            </button>
          </div>
        </div>
      </div>

      {/* Main D3 Bar Chart Canvas */}
      <div ref={containerRef} className="relative bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner overflow-x-auto">
        {processedData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Info className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold">No side effect toxicities matching current filter criteria.</p>
            <button
              onClick={() => setFilterSynergisticOnly(false)}
              className="text-xs text-cyan-400 underline hover:text-cyan-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full min-w-[620px]" />
        )}
      </div>

      {/* Active Polypharmacy Drug Legend Bar */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Active Regimen Drug Palette ({drugList.length} Selected Agents)</span>
          <span className="text-slate-500">Hover drug pill to highlight in chart</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {drugList.map((drug, idx) => {
            const norm = drug.toLowerCase().trim();
            const color = getDrugColor(norm, idx);
            const isHovered = hoveredDrug === norm;

            return (
              <span
                key={drug}
                onMouseEnter={() => setHoveredDrug(norm)}
                onMouseLeave={() => setHoveredDrug(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isHovered ? 'ring-2 ring-white scale-105 shadow-md' : 'opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: `${color}30`, borderColor: color, borderWidth: '1px', color }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {drug.charAt(0).toUpperCase() + drug.slice(1)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Focused Side Effect Clinical Inspector Card */}
      {selectedCategoryData && (
        <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700/80 space-y-3 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedCategoryData.iconSymbol}</span>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                  Clinical Toxicity Protocol: {selectedCategoryData.title}
                </h4>
                <p className="text-[10px] text-slate-400">{selectedCategoryData.category} Endpoint</p>
              </div>
            </div>
            {selectedCategoryData.isSynergistic ? (
              <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-full text-[10px] font-extrabold uppercase">
                ⚠️ {selectedCategoryData.synergyMultiplier}x Synergistic Multiplier
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-full text-[10px] font-bold">
                Single Drug Risk ({selectedCategoryData.totalSynergisticScore} pts)
              </span>
            )}
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">
            {selectedCategoryData.description}
          </p>

          {/* Contributing Drugs Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {selectedCategoryData.contributingDrugs.map((d) => (
              <div key={d.drugKey} className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold flex items-center gap-1.5" style={{ color: d.color }}>
                    <Pill className="w-3.5 h-3.5" /> {d.drugName}
                  </span>
                  <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    Severity: {d.score} / 10
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{d.mechanism}</p>
              </div>
            ))}
          </div>

          {/* Evidence-Based Clinical Mitigation Strategy */}
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-xs space-y-1 text-emerald-200">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Recommended Clinical Action & Monitoring Protocol
            </div>
            <p className="text-xs leading-relaxed text-emerald-100/90 pl-5">
              {selectedCategoryData.clinicalMitigation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
