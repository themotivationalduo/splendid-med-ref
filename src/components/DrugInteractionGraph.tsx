import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  CheckCircle2,
  Plus,
  X,
  Layers,
  Sparkles,
  Pill,
  Sliders,
  User,
  Activity,
  AlertCircle,
  TrendingDown,
  Check
} from 'lucide-react';

export interface InteractionNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  class: string;
  isPrimary?: boolean;
  group: 'nsaid' | 'anticoagulant' | 'acei' | 'statin' | 'antiinfective' | 'antiplatelet' | 'antidiabetic' | 'cardiac' | 'other';
  adjustmentType?: 'contraindicated' | 'dose_reduction' | 'precaution' | 'normal';
}

export interface InteractionLink extends d3.SimulationLinkDatum<InteractionNode> {
  source: string | InteractionNode;
  target: string | InteractionNode;
  severity: 'major' | 'moderate' | 'minor';
  mechanism: string;
  clinicalImpact: string;
  recommendation: string;
}

export interface InteractionNetworkData {
  nodes: InteractionNode[];
  links: InteractionLink[];
}

export interface DrugAdjustmentAlert {
  drugName: string;
  type: 'contraindicated' | 'dose_reduction' | 'precaution' | 'normal';
  badgeText: string;
  trigger: string;
  adjustedDosing: string;
  reasoning: string;
}

export interface DrugInteractionGraphProps {
  initialDrug?: string;
  drugList?: string[];
  onDrugListChange?: (updatedList: string[]) => void;
  patientAge?: number;
  patientWeight?: number;
  onPatientMetricsChange?: (metrics: { age: number; weight: number }) => void;
}

// Comprehensive Drug Metadata Database
const KNOWN_DRUG_META: Record<string, { name: string; class: string; group: InteractionNode['group'] }> = {
  warfarin: { name: 'Warfarin', class: 'Vitamin K Antagonist', group: 'anticoagulant' },
  aspirin: { name: 'Aspirin', class: 'Antiplatelet / NSAID', group: 'antiplatelet' },
  ibuprofen: { name: 'Ibuprofen', class: 'NSAID', group: 'nsaid' },
  naproxen: { name: 'Naproxen', class: 'NSAID', group: 'nsaid' },
  lisinopril: { name: 'Lisinopril', class: 'ACE Inhibitor', group: 'acei' },
  losartan: { name: 'Losartan', class: 'Angiotensin II Receptor Blocker', group: 'acei' },
  spironolactone: { name: 'Spironolactone', class: 'Aldosterone Antagonist / K+-Sparing Diuretic', group: 'acei' },
  furosemide: { name: 'Furosemide', class: 'Loop Diuretic', group: 'other' },
  sacubitril: { name: 'Sacubitril/Valsartan', class: 'ARNI', group: 'acei' },
  metformin: { name: 'Metformin', class: 'Biguanide', group: 'antidiabetic' },
  insulin: { name: 'Insulin', class: 'Hypoglycemic Agent', group: 'antidiabetic' },
  atorvastatin: { name: 'Atorvastatin', class: 'HMG-CoA Reductase Inhibitor', group: 'statin' },
  simvastatin: { name: 'Simvastatin', class: 'HMG-CoA Reductase Inhibitor', group: 'statin' },
  amiodarone: { name: 'Amiodarone', class: 'Class III Antiarrhythmic', group: 'cardiac' },
  fluconazole: { name: 'Fluconazole', class: 'Azole Antifungal', group: 'antiinfective' },
  ciprofloxacin: { name: 'Ciprofloxacin', class: 'Fluoroquinolone Antibiotic', group: 'antiinfective' },
  clarithromycin: { name: 'Clarithromycin', class: 'Macrolide Antibiotic', group: 'antiinfective' },
  sertraline: { name: 'Sertraline', class: 'SSRI Antidepressant', group: 'other' },
  acetaminophen: { name: 'Acetaminophen', class: 'Analgesic / Antipyretic', group: 'nsaid' },
  clopidogrel: { name: 'Clopidogrel', class: 'P2Y12 Antiplatelet', group: 'antiplatelet' },
  omeprazole: { name: 'Omeprazole', class: 'Proton Pump Inhibitor', group: 'other' },
  digoxin: { name: 'Digoxin', class: 'Cardiac Glycoside', group: 'cardiac' },
  lithium: { name: 'Lithium', class: 'Mood Stabilizer', group: 'other' },
  methotrexate: { name: 'Methotrexate', class: 'Antimetabolite / DMARD', group: 'other' },
  allopurinol: { name: 'Allopurinol', class: 'Xanthine Oxidase Inhibitor', group: 'other' },
  contrast: { name: 'Iodinated Contrast', class: 'Radiocontrast Agent', group: 'other' },
  alcohol: { name: 'Ethanol / Alcohol', class: 'CNS Depressant', group: 'other' },
  cimetidine: { name: 'Cimetidine', class: 'H2 Receptor Blocker', group: 'other' },
  nitroglycerin: { name: 'Nitroglycerin', class: 'Organic Nitrate Vasodilator', group: 'cardiac' },
  sildenafil: { name: 'Sildenafil', class: 'PDE5 Inhibitor', group: 'cardiac' },
  tramadol: { name: 'Tramadol', class: 'Centrally Acting Opioid', group: 'other' },
  tizanidine: { name: 'Tizanidine', class: 'Alpha-2 Adrenergic Agonist', group: 'other' },
  verapamil: { name: 'Verapamil', class: 'Non-Dihydropyridine CCB', group: 'cardiac' },
  diltiazem: { name: 'Diltiazem', class: 'Non-Dihydropyridine CCB', group: 'cardiac' }
};

// Key helper for pairwise interaction lookup
function getPairKey(a: string, b: string): string {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  return normA < normB ? `${normA}_${normB}` : `${normB}_${normA}`;
}

type InteractionDetail = Omit<InteractionLink, 'source' | 'target'>;

// Explicit Pairwise Interaction Registry
const PAIRWISE_INTERACTIONS: Record<string, InteractionDetail> = {
  [getPairKey('warfarin', 'aspirin')]: {
    severity: 'major',
    mechanism: 'Synergistic antihemostatic action + gastric mucosal erosion.',
    clinicalImpact: 'Severe risk of major upper gastrointestinal bleeding and intracranial hemorrhage.',
    recommendation: 'Avoid concurrent use unless strictly indicated (e.g. recent mechanical heart valve). Monitor INR closely.'
  },
  [getPairKey('warfarin', 'ibuprofen')]: {
    severity: 'major',
    mechanism: 'Platelet inhibition via COX-1 + competitive plasma protein displacement.',
    clinicalImpact: 'Markedly elevated GI ulceration and systemic bleeding risk.',
    recommendation: 'Substitute with acetaminophen or topical analgesics for pain management.'
  },
  [getPairKey('warfarin', 'naproxen')]: {
    severity: 'major',
    mechanism: 'Inhibition of COX-1 platelet aggregation and upper GI mucosal protection.',
    clinicalImpact: '3x to 5x increased hazard ratio for severe gastrointestinal hemorrhage.',
    recommendation: 'Avoid combination or co-prescribe PPI with frequent INR monitoring.'
  },
  [getPairKey('warfarin', 'amiodarone')]: {
    severity: 'major',
    mechanism: 'Potent inhibition of CYP2C9 and CYP3A4 hepatic clearance of S-warfarin.',
    clinicalImpact: 'Supratherapeutic INR spike (often 200-300% increase in warfarin level).',
    recommendation: 'Empirically decrease warfarin dosage by 30%-50% upon starting amiodarone.'
  },
  [getPairKey('warfarin', 'fluconazole')]: {
    severity: 'major',
    mechanism: 'Strong CYP2C9 enzyme inhibition blocking S-warfarin clearance.',
    clinicalImpact: 'Rapid accumulation of active warfarin with dangerous INR elevations.',
    recommendation: 'Monitor INR within 48-72 hours of starting fluconazole. Reduce warfarin dose.'
  },
  [getPairKey('warfarin', 'ciprofloxacin')]: {
    severity: 'major',
    mechanism: 'Displacement from albumin + gut flora alteration reducing endogenous Vitamin K.',
    clinicalImpact: 'Elevated prothrombin time and hemorrhagic tendency.',
    recommendation: 'Frequent INR monitoring during antibiotic course.'
  },
  [getPairKey('warfarin', 'sertraline')]: {
    severity: 'moderate',
    mechanism: 'Serotonin reuptake blockade impairs platelet aggregation.',
    clinicalImpact: 'Increased risk of bleeding despite normal INR values.',
    recommendation: 'Educate patient on symptoms of occult bleeding (petechiae, melena).'
  },
  [getPairKey('warfarin', 'acetaminophen')]: {
    severity: 'minor',
    mechanism: 'High-dose acetaminophen (>2g/day) inhibits warfarin metabolism via NAPQI buildup.',
    clinicalImpact: 'Modest increase in INR during prolonged high-dose use.',
    recommendation: 'Limit acetaminophen to <2g/day for patients on chronic warfarin.'
  },
  [getPairKey('warfarin', 'atorvastatin')]: {
    severity: 'minor',
    mechanism: 'Minor competitive CYP3A4 metabolism.',
    clinicalImpact: 'Slight fluctuation in prothrombin time.',
    recommendation: 'Routine INR monitoring when initiating statin therapy.'
  },
  [getPairKey('aspirin', 'ibuprofen')]: {
    severity: 'major',
    mechanism: 'Ibuprofen competitively blocks aspirin binding to platelet COX-1 active site.',
    clinicalImpact: 'Loss of cardioprotective antiplatelet effect of low-dose aspirin.',
    recommendation: 'Take aspirin at least 30 minutes before or 8 hours after ibuprofen.'
  },
  [getPairKey('ibuprofen', 'lisinopril')]: {
    severity: 'major',
    mechanism: 'NSAID prostaglandin inhibition causes afferent renal arteriolar vasoconstriction while ACEi dilates efferent arteriolar.',
    clinicalImpact: 'Acute decline in GFR (Triple Whammy effect if combined with diuretics) and loss of BP control.',
    recommendation: 'Monitor serum creatinine and blood pressure. Avoid prolonged concurrent use in renal impairment.'
  },
  [getPairKey('ibuprofen', 'furosemide')]: {
    severity: 'moderate',
    mechanism: 'Inhibition of renal prostaglandins reduces natriuretic and antihypertensive efficacy of loop diuretics.',
    clinicalImpact: 'Fluid retention, blunted diuretic response, potential acute kidney injury.',
    recommendation: 'Monitor weight and peripheral edema. Adjust diuretic dose if necessary.'
  },
  [getPairKey('ibuprofen', 'lithium')]: {
    severity: 'major',
    mechanism: 'Decreased renal prostaglandin synthesis reduces renal lithium clearance by 25-50%.',
    clinicalImpact: 'Lithium toxicity (tremors, ataxia, confusion, seizures).',
    recommendation: 'Avoid NSAID use or reduce lithium dosage with serial serum level monitoring.'
  },
  [getPairKey('ibuprofen', 'methotrexate')]: {
    severity: 'major',
    mechanism: 'Inhibition of renal tubular secretion of methotrexate.',
    clinicalImpact: 'Severe bone marrow suppression and gastrointestinal toxicity.',
    recommendation: 'Avoid high-dose methotrexate with NSAIDs.'
  },
  [getPairKey('lisinopril', 'spironolactone')]: {
    severity: 'major',
    mechanism: 'Additive aldosterone inhibition leading to reduced renal potassium excretion.',
    clinicalImpact: 'Severe life-threatening hyperkalemia (K+ > 6.0 mEq/L) and cardiac arrhythmias.',
    recommendation: 'Regularly monitor serum potassium and renal function (eGFR).'
  },
  [getPairKey('lisinopril', 'sacubitril')]: {
    severity: 'major',
    mechanism: 'Dual inhibition of neprilysin and ACE degrades bradykinin breakdown pathways.',
    clinicalImpact: 'High risk of severe life-threatening angioedema.',
    recommendation: 'Contraindicated! Require a 36-hour washout period when switching from ACEi to ARNI.'
  },
  [getPairKey('lisinopril', 'losartan')]: {
    severity: 'major',
    mechanism: 'Dual renin-angiotensin-aldosterone system (RAAS) blockade.',
    clinicalImpact: 'Increased hypotension, syncope, hyperkalemia, and renal failure without added survival benefit.',
    recommendation: 'Avoid combination of ACEi + ARB in heart failure or diabetic nephropathy.'
  },
  [getPairKey('lisinopril', 'allopurinol')]: {
    severity: 'moderate',
    mechanism: 'Hypersensitivity reaction synergy.',
    clinicalImpact: 'Increased incidence of Stevens-Johnson syndrome or systemic hypersensitivity.',
    recommendation: 'Monitor for skin rash and fever upon starting allopurinol with ACE inhibitors.'
  },
  [getPairKey('metformin', 'contrast')]: {
    severity: 'major',
    mechanism: 'Contrast-induced acute kidney injury leads to metformin accumulation.',
    clinicalImpact: 'Severe, life-threatening lactic acidosis.',
    recommendation: 'Withhold metformin prior to iodinated contrast in eGFR 30-60. Recheck eGFR 48 hrs post-procedure.'
  },
  [getPairKey('metformin', 'alcohol')]: {
    severity: 'major',
    mechanism: 'Potentiates metformin effect on lactate metabolism in liver + impairs gluconeogenesis.',
    clinicalImpact: 'Severe hypoglycemia and elevated risk of lactic acidosis.',
    recommendation: 'Warn patients against excessive acute or chronic alcohol consumption.'
  },
  [getPairKey('metformin', 'cimetidine')]: {
    severity: 'moderate',
    mechanism: 'Inhibition of organic cation transporter (OCT2) reduces renal elimination.',
    clinicalImpact: 'Increased plasma metformin concentrations by up to 50%.',
    recommendation: 'Consider alternative H2 blocker (e.g. famotidine).'
  },
  [getPairKey('metformin', 'furosemide')]: {
    severity: 'moderate',
    mechanism: 'Furosemide increases metformin Cmax without changing renal clearance.',
    clinicalImpact: 'Potential enhancement of metformin efficacy or lactic acidosis risk in dehydration.',
    recommendation: 'Ensure adequate fluid hydration status.'
  },
  [getPairKey('clopidogrel', 'omeprazole')]: {
    severity: 'major',
    mechanism: 'Omeprazole competitively inhibits CYP2C19, preventing activation of clopidogrel prodrug.',
    clinicalImpact: 'Reduced antiplatelet efficacy leading to increased risk of ischemic stroke and stent thrombosis.',
    recommendation: 'Switch omeprazole to pantoprazole or H2 blocker (famotidine) which do not inhibit CYP2C19.'
  },
  [getPairKey('atorvastatin', 'clarithromycin')]: {
    severity: 'major',
    mechanism: 'Potent CYP3A4 inhibition increases statin AUC by 400-500%.',
    clinicalImpact: 'High risk of statin-induced myopathy, elevated CPK, and severe rhabdomyolysis.',
    recommendation: 'Temporarily hold atorvastatin during macrolide antibiotic course.'
  },
  [getPairKey('amiodarone', 'digoxin')]: {
    severity: 'major',
    mechanism: 'Inhibition of P-glycoprotein efflux transporter reduces digoxin renal and biliary clearance.',
    clinicalImpact: 'Doubling of serum digoxin levels with nausea, AV block, and ventricular arrhythmias.',
    recommendation: 'Empirically decrease digoxin dose by 50% when initiating amiodarone.'
  },
  [getPairKey('digoxin', 'furosemide')]: {
    severity: 'major',
    mechanism: 'Loop diuretic induced hypokalemia and hypomagnesemia sensitize myocardium to digoxin.',
    clinicalImpact: 'Precipitation of fatal digoxin toxicity despite normal serum digoxin concentrations.',
    recommendation: 'Maintain serum potassium > 4.0 mEq/L and monitor serum magnesium.'
  },
  [getPairKey('nitroglycerin', 'sildenafil')]: {
    severity: 'major',
    mechanism: 'Synergistic cGMP accumulation causing profound systemic vasodilation.',
    clinicalImpact: 'Severe refractory hypotension, myocardial infarction, and syncope.',
    recommendation: 'Strictly contraindicated! Do not administer nitrates within 24 hours of sildenafil.'
  },
  [getPairKey('sertraline', 'tramadol')]: {
    severity: 'major',
    mechanism: 'Dual enhancement of central serotonergic neurotransmission.',
    clinicalImpact: 'Serotonin syndrome (hyperthermia, neuromuscular irritability, autonomic instability).',
    recommendation: 'Avoid combination or monitor closely for clonus, tremor, and agitation.'
  },
  [getPairKey('ciprofloxacin', 'tizanidine')]: {
    severity: 'major',
    mechanism: 'Potent CYP1A2 inhibition increases tizanidine Cmax by 7-fold.',
    clinicalImpact: 'Profound hypotension, severe bradycardia, and prolonged sedation.',
    recommendation: 'Contraindicated combination. Select alternative antibiotic.'
  }
};

// Polypharmacy Preset Regimens for clinical scenarios
export const POLYPHARMACY_PRESETS = [
  {
    id: 'cardio_anticoag',
    label: 'Cardio + Anticoagulation',
    emoji: '🫀',
    description: 'High bleeding risk polypharmacy in AFib / CAD',
    drugs: ['Warfarin', 'Aspirin', 'Amiodarone', 'Atorvastatin', 'Clopidogrel']
  },
  {
    id: 'triple_whammy',
    label: 'Triple Whammy (Renal Failure)',
    emoji: '🚨',
    description: 'Combined NSAID + ACEi + Diuretic acute kidney injury risk',
    drugs: ['Ibuprofen', 'Lisinopril', 'Furosemide', 'Spironolactone']
  },
  {
    id: 'metabolic_combo',
    label: 'Type 2 Diabetes & HTN',
    emoji: '🩺',
    description: 'Common diabetic polypharmacy regimen',
    drugs: ['Metformin', 'Lisinopril', 'Atorvastatin', 'Aspirin', 'Ibuprofen']
  },
  {
    id: 'antifungal_warfarin',
    label: 'Infection + Anticoagulation',
    emoji: '🧫',
    description: 'CYP2C9 enzyme inhibition and INR spike risk',
    drugs: ['Warfarin', 'Fluconazole', 'Ciprofloxacin', 'Sertraline', 'Acetaminophen']
  },
  {
    id: 'statin_inhibitors',
    label: 'Statin Toxicity Network',
    emoji: '⚡',
    description: 'CYP3A4 / P-gp transport inhibition and rhabdomyolysis',
    drugs: ['Atorvastatin', 'Clarithromycin', 'Diltiazem', 'Digoxin', 'Amiodarone']
  }
];

// Calculate estimated Cockcroft-Gault Creatinine Clearance (mL/min)
export function calculateEstCrCl(age: number, weight: number, scr = 1.0, isFemale = false): number {
  if (age <= 0 || weight <= 0 || scr <= 0) return 90;
  let crcl = ((140 - age) * weight) / (72 * scr);
  if (isFemale) crcl *= 0.85;
  return Math.round(crcl * 10) / 10;
}

// Evaluate Physiological Markers (Age & Body Weight) for Dose Adjustments & Contraindications
export function evaluatePhysiologicalAdjustments(
  drugName: string,
  age: number,
  weight: number
): DrugAdjustmentAlert {
  const norm = drugName.toLowerCase().trim();
  const estCrCl = calculateEstCrCl(age, weight);

  // 1. NSAIDs
  if (/ibuprofen|naproxen|ketorolac|indomethacin|diclofenac/i.test(norm)) {
    if (age >= 65) {
      return {
        drugName,
        type: 'contraindicated',
        badgeText: 'BEERS CRITERIA CONTRAINDICATION',
        trigger: `Age ${age} yrs (≥65) • Beers Criteria High Risk`,
        adjustedDosing: 'Avoid chronic oral NSAID therapy. Substitute with topical NSAID or Acetaminophen ≤2g/day.',
        reasoning: 'Severe risk of gastrointestinal hemorrhage, peptic ulceration, and precipitation of acute kidney injury or heart failure exacerbation in elderly adults.'
      };
    }
    if (weight < 50) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'LOW WEIGHT DOSE CAP',
        trigger: `Weight ${weight} kg (<50 kg)`,
        adjustedDosing: 'Cap single dose at 200 mg (Ibuprofen) or 220 mg (Naproxen) PRN.',
        reasoning: 'Reduced volume of distribution increases peak plasma concentration (Cmax) and renal toxicity hazard.'
      };
    }
  }

  // 2. Warfarin
  if (/warfarin/i.test(norm)) {
    if (age >= 80 && weight <= 60) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'HIGH BLEEDING RISK - REDUCE DOSE 50%',
        trigger: `Age ${age} yrs (≥80) AND Weight ${weight} kg (≤60 kg)`,
        adjustedDosing: 'Reduce starting dose by 50% (1.25 mg - 2.5 mg daily). Check INR at 48-72h.',
        reasoning: 'Combined geriatric clearance decline and low distribution mass dramatically increase sensitivity to oral anticoagulants.'
      };
    }
    if (age >= 75 || weight < 50) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'REDUCE STARTING DOSE 25-50%',
        trigger: age >= 75 ? `Age ${age} yrs (≥75)` : `Weight ${weight} kg (<50 kg)`,
        adjustedDosing: 'Initiate at 2.5 mg PO daily (standard 5 mg daily). Target INR 2.0 - 3.0.',
        reasoning: 'Age-related decline in CYP2C9 metabolic capacity and liver perfusion increases warfarin AUC.'
      };
    }
  }

  // 3. Metformin
  if (/metformin/i.test(norm)) {
    if (estCrCl < 30) {
      return {
        drugName,
        type: 'contraindicated',
        badgeText: 'RENAL CONTRAINDICATION (CrCl < 30)',
        trigger: `Est. CrCl ${estCrCl} mL/min (<30) • Age ${age}y, Wt ${weight}kg`,
        adjustedDosing: 'CONTRAINDICATED! Discontinue Metformin due to fatal lactic acidosis risk.',
        reasoning: 'Compromised renal tubular excretion leads to toxic metformin accumulation and systemic lactic acidosis.'
      };
    }
    if (estCrCl < 45 || age >= 75) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'MAX DOSE 1000mg/DAY',
        trigger: estCrCl < 45 ? `Est. CrCl ${estCrCl} mL/min (<45)` : `Age ${age} yrs (≥75)`,
        adjustedDosing: 'Cap max dose at 500 mg PO BID (1000 mg total daily). Monitor eGFR/CrCl q3mo.',
        reasoning: 'Moderate renal impairment or advanced age decreases renal clearance of biguanides.'
      };
    }
  }

  // 4. Lisinopril / ACE Inhibitors
  if (/lisinopril|enalapril|ramipril|captopril/i.test(norm)) {
    if (estCrCl < 30) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'REDUCE STARTING DOSE (2.5mg)',
        trigger: `Est. CrCl ${estCrCl} mL/min (<30)`,
        adjustedDosing: 'Initiate at 2.5 mg PO daily. Monitor serum K+ and creatinine within 1 week.',
        reasoning: 'Renal clearance is primary route of elimination. Avoid precipitous hyperkalemia.'
      };
    }
    if (age >= 75 || weight < 50) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'GERIATRIC STARTING DOSE (2.5-5mg)',
        trigger: age >= 75 ? `Age ${age} yrs (≥75)` : `Weight ${weight} kg (<50 kg)`,
        adjustedDosing: 'Start at 2.5 mg to 5 mg PO daily to prevent first-dose orthostatic hypotension.',
        reasoning: 'Blunted baroreceptor reflex and altered intravascular volume in elderly patients.'
      };
    }
  }

  // 5. Digoxin
  if (/digoxin/i.test(norm)) {
    if (age >= 65 || weight < 50) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'BEERS CRITERIA DOSE CAP (0.125mg)',
        trigger: age >= 65 ? `Age ${age} yrs (≥65) • Beers Criteria` : `Weight ${weight} kg (<50 kg)`,
        adjustedDosing: 'Cap dose at ≤0.125 mg daily (or 0.0625 mg QOD). Target serum digoxin 0.5-0.9 ng/mL.',
        reasoning: 'Reduced renal clearance and decreased lean body mass increase risk of fatal digoxin toxicity.'
      };
    }
  }

  // 6. Direct Anticoagulants
  if (/apixaban|eliquis|rivaroxaban|xarelto|dabigatran|pradaxa/i.test(norm)) {
    if (age >= 80 && weight <= 60) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'FDA CRITERIA DOSE REDUCTION',
        trigger: `Age ${age} yrs (≥80) AND Weight ${weight} kg (≤60 kg)`,
        adjustedDosing: 'Reduce Apixaban dose to 2.5 mg PO BID (from 5 mg BID).',
        reasoning: 'FDA dosing criteria met for stroke prevention in nonvalvular AFib to lower major hemorrhage risk.'
      };
    }
    if (estCrCl < 30) {
      return {
        drugName,
        type: 'contraindicated',
        badgeText: 'RENAL CONTRAINDICATION / CAUTION',
        trigger: `Est. CrCl ${estCrCl} mL/min (<30)`,
        adjustedDosing: 'Avoid Dabigatran / Rivaroxaban. Consider dose-adjusted Apixaban or Warfarin.',
        reasoning: 'High renal elimination fraction risks severe drug accumulation and fatal bleeding.'
      };
    }
  }

  // 7. Statins
  if (/statin|atorvastatin|simvastatin|rosuvastatin/i.test(norm)) {
    if (age >= 75 || weight < 50) {
      return {
        drugName,
        type: 'precaution',
        badgeText: 'STATIN MYOPATHY PRECAUTION',
        trigger: age >= 75 ? `Age ${age} yrs (≥75)` : `Weight ${weight} kg (<50 kg)`,
        adjustedDosing: 'Cap Simvastatin at 20 mg daily or Rosuvastatin at 10 mg daily. Monitor CPK.',
        reasoning: 'Elderly or low body weight patients are at increased risk of statin-induced rhabdomyolysis.'
      };
    }
  }

  // 8. Anti-infectives
  if (/fluconazole|ciprofloxacin|clarithromycin|levofloxacin/i.test(norm)) {
    if (estCrCl < 50 || age >= 75) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: '50% RENAL DOSE REDUCTION',
        trigger: estCrCl < 50 ? `Est. CrCl ${estCrCl} mL/min (<50)` : `Age ${age} yrs (≥75)`,
        adjustedDosing: 'Reduce maintenance dose by 50% after standard initial loading dose.',
        reasoning: 'Renal excretion is reduced. Unadjusted dosing leads to neurotoxicity and QT prolongation.'
      };
    }
  }

  // 9. Lithium
  if (/lithium/i.test(norm)) {
    if (age >= 65 || estCrCl < 50) {
      return {
        drugName,
        type: 'dose_reduction',
        badgeText: 'NARROW THERAPEUTIC INDEX REDUCTION',
        trigger: age >= 65 ? `Age ${age} yrs (≥65)` : `Est. CrCl ${estCrCl} mL/min (<50)`,
        adjustedDosing: 'Reduce dose by 30-50%. Monitor trough lithium levels (target 0.4 - 0.6 mEq/L).',
        reasoning: 'Renal lithium clearance drops proportionally with GFR decline in elderly adults.'
      };
    }
  }

  // 10. General Fallback for Advanced Age / Low Mass
  if (age >= 80) {
    return {
      drugName,
      type: 'precaution',
      badgeText: 'GERIATRIC DENSITY PRECAUTION',
      trigger: `Age ${age} yrs (≥80) • Very Elderly`,
      adjustedDosing: 'Start with 25-50% lower initial dose. Monitor for anticholinergic and renal adverse effects.',
      reasoning: 'Multi-organ physiological reserve decline and altered pharmacodynamics in nonagenarian/octogenarian patients.'
    };
  }

  if (weight <= 45) {
    return {
      drugName,
      type: 'precaution',
      badgeText: 'LOW BODY MASS PRECAUTION',
      trigger: `Weight ${weight} kg (≤45 kg)`,
      adjustedDosing: 'Calculate mg/kg weight-based dosing where available.',
      reasoning: 'Significantly decreased total body water and volume of distribution increases risk of toxicity.'
    };
  }

  return {
    drugName,
    type: 'normal',
    badgeText: 'STANDARD DOSING APPROPRIATE',
    trigger: 'Standard Adult Markers',
    adjustedDosing: 'Standard adult therapeutic dosing indicated.',
    reasoning: 'Patient age and body weight fall within standard adult therapeutic windows.'
  };
}

export function DrugInteractionGraph({
  initialDrug = 'Warfarin',
  drugList,
  onDrugListChange,
  patientAge = 72,
  patientWeight = 62,
  onPatientMetricsChange
}: DrugInteractionGraphProps) {
  // Patient Physiological Markers State
  const [age, setAge] = useState<number>(patientAge);
  const [weight, setWeight] = useState<number>(patientWeight);

  useEffect(() => {
    if (patientAge !== undefined) setAge(patientAge);
  }, [patientAge]);

  useEffect(() => {
    if (patientWeight !== undefined) setWeight(patientWeight);
  }, [patientWeight]);

  const updateMetrics = useCallback((newAge: number, newWeight: number) => {
    setAge(newAge);
    setWeight(newWeight);
    onPatientMetricsChange?.({ age: newAge, weight: newWeight });
  }, [onPatientMetricsChange]);

  // Multi-drug regimen state initialized from props or default multi-drug combo
  const [regimen, setRegimen] = useState<string[]>(() => {
    if (drugList && drugList.length > 0) return drugList;
    return ['Warfarin', 'Aspirin', 'Ibuprofen', 'Lisinopril', 'Metformin'];
  });

  // Sync internal regimen state if drugList prop changes from outside
  useEffect(() => {
    if (drugList && drugList.length > 0 && JSON.stringify(drugList) !== JSON.stringify(regimen)) {
      setRegimen(drugList);
    }
  }, [drugList]);

  const updateRegimen = useCallback((newList: string[]) => {
    setRegimen(newList);
    onDrugListChange?.(newList);
  }, [onDrugListChange]);

  // View Mode: 'polypharmacy' (multi-drug network) vs 'single' (focused agent)
  const [viewMode, setViewMode] = useState<'polypharmacy' | 'single'>('polypharmacy');
  const [selectedAgent, setSelectedAgent] = useState<string>(initialDrug);
  const [newDrugInput, setNewDrugInput] = useState<string>('');

  const [severityFilter, setSeverityFilter] = useState<'all' | 'major' | 'moderate' | 'minor'>('all');
  const [selectedLink, setSelectedLink] = useState<InteractionLink | null>(null);
  const [selectedNode, setSelectedNode] = useState<InteractionNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Helper to add a drug to regimen
  const handleAddDrug = (drugName: string) => {
    const clean = drugName.trim();
    if (!clean) return;
    const exists = regimen.some(d => d.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      const updated = [...regimen, clean];
      updateRegimen(updated);
    }
    setNewDrugInput('');
  };

  // Helper to remove a drug from regimen
  const handleRemoveDrug = (drugToRemove: string) => {
    if (regimen.length <= 1) return;
    const updated = regimen.filter(d => d.toLowerCase() !== drugToRemove.toLowerCase());
    updateRegimen(updated);
    if (selectedAgent.toLowerCase() === drugToRemove.toLowerCase()) {
      setSelectedAgent(updated[0] || 'Warfarin');
    }
  };

  // Helper to resolve node metadata
  const resolveNode = useCallback((drugName: string, isPrimary = false): InteractionNode => {
    const key = drugName.toLowerCase().trim();
    const known = KNOWN_DRUG_META[key];
    const alert = evaluatePhysiologicalAdjustments(drugName, age, weight);

    if (known) {
      return {
        id: key,
        name: known.name,
        class: known.class,
        group: known.group,
        isPrimary,
        adjustmentType: alert.type
      };
    }

    let group: InteractionNode['group'] = 'other';
    if (/statin/i.test(drugName)) group = 'statin';
    else if (/pril|sartan/i.test(drugName)) group = 'acei';
    else if (/profen|oxib|aspirin/i.test(drugName)) group = 'nsaid';
    else if (/ban|rin|farin/i.test(drugName)) group = 'anticoagulant';
    else if (/mycin|cillin|vir|zole|floxacin/i.test(drugName)) group = 'antiinfective';
    else if (/formin|glip|glit|glu/i.test(drugName)) group = 'antidiabetic';

    const formattedName = drugName.charAt(0).toUpperCase() + drugName.slice(1);
    return {
      id: key,
      name: formattedName,
      class: 'Pharmaceutical Agent',
      group,
      isPrimary,
      adjustmentType: alert.type
    };
  }, [age, weight]);

  // Construct Multi-Drug Polypharmacy Network Data
  const fullNetworkData = useMemo<InteractionNetworkData>(() => {
    if (viewMode === 'single') {
      const primaryKey = selectedAgent.toLowerCase().trim();
      const primaryNode = resolveNode(selectedAgent, true);
      const nodes: InteractionNode[] = [primaryNode];
      const links: InteractionLink[] = [];

      const otherDrugs = new Set<string>();
      regimen.forEach(d => {
        if (d.toLowerCase() !== primaryKey) otherDrugs.add(d);
      });

      Object.keys(PAIRWISE_INTERACTIONS).forEach(pairKey => {
        if (pairKey.includes(primaryKey)) {
          const parts = pairKey.split('_');
          const other = parts[0] === primaryKey ? parts[1] : parts[0];
          otherDrugs.add(other);
        }
      });

      otherDrugs.forEach(otherKey => {
        const pKey = getPairKey(primaryKey, otherKey);
        const detail = PAIRWISE_INTERACTIONS[pKey];
        if (detail) {
          const targetNode = resolveNode(otherKey);
          nodes.push(targetNode);
          links.push({
            source: primaryNode.id,
            target: targetNode.id,
            ...detail
          });
        }
      });

      return { nodes, links };
    }

    const nodeMap = new Map<string, InteractionNode>();
    regimen.forEach(drugName => {
      const node = resolveNode(drugName, drugName.toLowerCase() === selectedAgent.toLowerCase());
      nodeMap.set(node.id, node);
    });

    const links: InteractionLink[] = [];
    const activeDrugKeys = Array.from(nodeMap.keys());

    for (let i = 0; i < activeDrugKeys.length; i++) {
      for (let j = i + 1; j < activeDrugKeys.length; j++) {
        const drugA = activeDrugKeys[i];
        const drugB = activeDrugKeys[j];
        const pairKey = getPairKey(drugA, drugB);
        const detail = PAIRWISE_INTERACTIONS[pairKey];

        if (detail) {
          links.push({
            source: drugA,
            target: drugB,
            ...detail
          });
        } else {
          const nodeA = nodeMap.get(drugA)!;
          const nodeB = nodeMap.get(drugB)!;
          if (
            (nodeA.group === 'nsaid' && nodeB.group === 'anticoagulant') ||
            (nodeB.group === 'nsaid' && nodeA.group === 'anticoagulant')
          ) {
            links.push({
              source: drugA,
              target: drugB,
              severity: 'major',
              mechanism: 'Class Synergy: NSAID COX inhibition impairs platelet hemostasis + Anticoagulant activity.',
              clinicalImpact: 'Significantly increased bleeding risk and upper GI mucosal ulceration.',
              recommendation: 'Monitor CBC and bleeding parameters. Consider gastroprotective PPI therapy.'
            });
          } else if (
            (nodeA.group === 'nsaid' && nodeB.group === 'acei') ||
            (nodeB.group === 'nsaid' && nodeA.group === 'acei')
          ) {
            links.push({
              source: drugA,
              target: drugB,
              severity: 'major',
              mechanism: 'Class Synergy: NSAID afferent vasoconstriction + ACEi efferent renal vasodilation.',
              clinicalImpact: 'Synergistic decrease in glomerular filtration rate (GFR).',
              recommendation: 'Monitor serum creatinine and electrolytes regularly.'
            });
          }
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links
    };
  }, [viewMode, selectedAgent, regimen, resolveNode]);

  // Risk breakdown stats for current regimen
  const riskStats = useMemo(() => {
    let major = 0;
    let moderate = 0;
    let minor = 0;
    fullNetworkData.links.forEach(l => {
      if (l.severity === 'major') major++;
      else if (l.severity === 'moderate') moderate++;
      else minor++;
    });
    return { major, moderate, minor, total: fullNetworkData.links.length };
  }, [fullNetworkData]);

  // Calculate Physiological Dose Adjustments across entire regimen
  const regimenAdjustments = useMemo(() => {
    return regimen.map(drug => evaluatePhysiologicalAdjustments(drug, age, weight));
  }, [regimen, age, weight]);

  const estCrCl = useMemo(() => calculateEstCrCl(age, weight), [age, weight]);

  const adjustmentCounts = useMemo(() => {
    let contraindicated = 0;
    let doseReduction = 0;
    let precaution = 0;
    regimenAdjustments.forEach(a => {
      if (a.type === 'contraindicated') contraindicated++;
      else if (a.type === 'dose_reduction') doseReduction++;
      else if (a.type === 'precaution') precaution++;
    });
    return { contraindicated, doseReduction, precaution, total: regimenAdjustments.length };
  }, [regimenAdjustments]);

  // Filtered links and nodes based on severity & search
  const filteredData = useMemo(() => {
    let links = fullNetworkData.links;
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

    const nodeIds = new Set<string>();
    links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      nodeIds.add(srcId);
      nodeIds.add(tgtId);
    });

    if (viewMode === 'polypharmacy') {
      fullNetworkData.nodes.forEach(n => nodeIds.add(n.id));
    }

    const nodes = fullNetworkData.nodes
      .filter(n => nodeIds.has(n.id))
      .map(n => ({ ...n }));

    const clonedLinks = links.map(l => ({ ...l }));

    return { nodes, links: clonedLinks };
  }, [fullNetworkData, severityFilter, searchQuery, viewMode]);

  // Render D3 Force Directed Graph
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = 480;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('class', 'graph-container');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3.5])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    const simulation = d3
      .forceSimulation<InteractionNode>(filteredData.nodes)
      .force(
        'link',
        d3
          .forceLink<InteractionNode, InteractionLink>(filteredData.links)
          .id(d => d.id)
          .distance(filteredData.nodes.length > 6 ? 140 : 120)
      )
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(44));

    // Render Links (Edges)
    const link = g
      .append('g')
      .attr('stroke-opacity', 0.85)
      .selectAll<SVGLineElement, InteractionLink>('line')
      .data(filteredData.links)
      .join('line')
      .attr('stroke', (d: InteractionLink) => {
        if (d.severity === 'major') return '#F43F5E';
        if (d.severity === 'moderate') return '#F59E0B';
        return '#3B82F6';
      })
      .attr('stroke-width', (d: InteractionLink) => (d.severity === 'major' ? 3.8 : d.severity === 'moderate' ? 2.8 : 2))
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
        const relatedLink = filteredData.links.find(
          l =>
            (typeof l.source === 'object' ? (l.source as InteractionNode).id === d.id : l.source === d.id) ||
            (typeof l.target === 'object' ? (l.target as InteractionNode).id === d.id : l.target === d.id)
        );
        if (relatedLink) setSelectedLink(relatedLink);
      });

    // Outer Physiological Warning Halo Ring
    node
      .append('circle')
      .attr('r', (d: InteractionNode) => (d.isPrimary ? 33 : 26))
      .attr('fill', 'none')
      .attr('stroke', (d: InteractionNode) => {
        if (d.adjustmentType === 'contraindicated') return '#F43F5E'; // Red
        if (d.adjustmentType === 'dose_reduction') return '#F59E0B'; // Amber
        if (d.adjustmentType === 'precaution') return '#38BDF8'; // Blue
        return 'transparent';
      })
      .attr('stroke-width', (d: InteractionNode) => (d.adjustmentType === 'contraindicated' ? 4 : d.adjustmentType === 'dose_reduction' ? 3.5 : 2))
      .attr('stroke-dasharray', (d: InteractionNode) => (d.adjustmentType === 'contraindicated' ? '4,3' : 'none'))
      .attr('class', (d: InteractionNode) => (d.adjustmentType === 'contraindicated' ? 'animate-pulse' : ''));

    // Node Main Circle
    node
      .append('circle')
      .attr('r', (d: InteractionNode) => (d.isPrimary ? 25 : 19))
      .attr('fill', (d: InteractionNode) => {
        if (d.isPrimary) return '#0F172A';
        if (d.group === 'nsaid') return '#0284C7';
        if (d.group === 'anticoagulant') return '#E11D48';
        if (d.group === 'antiplatelet') return '#F97316';
        if (d.group === 'acei') return '#10B981';
        if (d.group === 'antiinfective') return '#8B5CF6';
        if (d.group === 'statin') return '#D97706';
        if (d.group === 'cardiac') return '#EC4899';
        if (d.group === 'antidiabetic') return '#14B8A6';
        return '#64748B';
      })
      .attr('stroke', (d: InteractionNode) => (d.isPrimary ? '#38BDF8' : '#FFFFFF'))
      .attr('stroke-width', (d: InteractionNode) => (d.isPrimary ? 3.5 : 2.5))
      .attr('class', 'shadow-lg transition-transform hover:scale-110');

    // Node Text Label
    node
      .append('text')
      .text((d: InteractionNode) => {
        let badge = '';
        if (d.adjustmentType === 'contraindicated') badge = ' 🚫';
        else if (d.adjustmentType === 'dose_reduction') badge = ' ⚠️';
        return `${d.name}${badge}`;
      })
      .attr('x', 0)
      .attr('y', (d: InteractionNode) => (d.isPrimary ? 44 : 38))
      .attr('text-anchor', 'middle')
      .attr('fill', '#0F172A')
      .attr('font-size', (d: InteractionNode) => (d.isPrimary ? '12px' : '11px'))
      .attr('font-weight', (d: InteractionNode) => (d.isPrimary ? '800' : '700'))
      .attr('pointer-events', 'none')
      .attr('class', 'select-none drop-shadow-xs');

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
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 transition-all">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl">
            <Network className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Polypharmacy & Physiological Marker Visualizer
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full">
                D3.js + Renal / Geriatric Rules
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Calculates dosage adjustments and contraindications based on patient age, body mass, and estimated GFR.
            </p>
          </div>
        </div>

        {/* View Mode Switch */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start lg:self-center">
          <button
            onClick={() => {
              setViewMode('polypharmacy');
              setSelectedLink(null);
              setSelectedNode(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'polypharmacy'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Polypharmacy Regimen ({regimen.length})
          </button>
          <button
            onClick={() => {
              setViewMode('single');
              setSelectedLink(null);
              setSelectedNode(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'single'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5" /> Single Agent Focus
          </button>
        </div>
      </div>

      {/* Patient Physiological Markers Bar (Age & Weight Inputs) */}
      <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 rounded-xl border border-blue-200/60 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Patient Physiological Profile:
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Est. CrCl: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{estCrCl} mL/min</span>
            </span>

            {age >= 65 && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Beers Criteria Active (≥65y)
              </span>
            )}
          </div>
        </div>

        {/* Input Controls for Age & Weight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-blue-100 dark:border-slate-800">
          {/* Age Input Control */}
          <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Patient Age:</span>
                <span className="text-blue-600 dark:text-blue-400 text-sm font-extrabold">{age} years</span>
              </label>
              <input
                type="number"
                min={18}
                max={110}
                value={age}
                onChange={e => updateMetrics(Math.max(18, Math.min(110, Number(e.target.value) || 18)), weight)}
                className="w-16 px-2 py-0.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-center"
              />
            </div>
            <input
              type="range"
              min={18}
              max={100}
              value={age}
              onChange={e => updateMetrics(Number(e.target.value), weight)}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Age Presets:</span>
              <div className="flex gap-1">
                {[
                  { label: '45y Adult', a: 45 },
                  { label: '68y Senior', a: 68 },
                  { label: '78y Geriatric', a: 78 },
                  { label: '88y Frail', a: 88 }
                ].map(p => (
                  <button
                    key={p.a}
                    onClick={() => updateMetrics(p.a, weight)}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Weight Input Control */}
          <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Body Mass / Weight:</span>
                <span className="text-blue-600 dark:text-blue-400 text-sm font-extrabold">{weight} kg</span>
                <span className="text-[10px] text-slate-400">({Math.round(weight * 2.20462)} lbs)</span>
              </label>
              <input
                type="number"
                min={30}
                max={200}
                value={weight}
                onChange={e => updateMetrics(age, Math.max(30, Math.min(200, Number(e.target.value) || 30)))}
                className="w-16 px-2 py-0.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-center"
              />
            </div>
            <input
              type="range"
              min={35}
              max={140}
              value={weight}
              onChange={e => updateMetrics(age, Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Weight Presets:</span>
              <div className="flex gap-1">
                {[
                  { label: '45kg Low', w: 45 },
                  { label: '62kg Lean', w: 62 },
                  { label: '75kg Std', w: 75 },
                  { label: '110kg Obese', w: 110 }
                ].map(p => (
                  <button
                    key={p.w}
                    onClick={() => updateMetrics(age, p.w)}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Physiological Adjustments Alert Banner */}
        <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">Physiological Dosing Impact:</span>
            {adjustmentCounts.contraindicated > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-full text-[10px] font-extrabold">
                {adjustmentCounts.contraindicated} Contraindicated 🚫
              </span>
            )}
            {adjustmentCounts.doseReduction > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full text-[10px] font-extrabold">
                {adjustmentCounts.doseReduction} Dose Reduction Required ⚠️
              </span>
            )}
            {adjustmentCounts.precaution > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full text-[10px] font-extrabold">
                {adjustmentCounts.precaution} Precaution
              </span>
            )}
            {adjustmentCounts.contraindicated === 0 && adjustmentCounts.doseReduction === 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                <Check className="w-3 h-3" /> Standard Dosing OK
              </span>
            )}
          </div>

          <span className="text-[10px] text-slate-400 italic">
            Calculated for Age {age}y, Weight {weight}kg (Est. CrCl {estCrCl} mL/min)
          </span>
        </div>
      </div>

      {/* Regimen Management Bar */}
      <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Active Regimen Drugs ({regimen.length}):
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Presets:</span>
            {POLYPHARMACY_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => updateRegimen(preset.drugs)}
                className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 shadow-2xs"
                title={preset.description}
              >
                <span>{preset.emoji}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Drug Pill Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
          {regimen.map(drug => {
            const alert = evaluatePhysiologicalAdjustments(drug, age, weight);
            return (
              <span
                key={drug}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold shadow-2xs transition-all ${
                  alert.type === 'contraindicated'
                    ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800 ring-2 ring-rose-500'
                    : alert.type === 'dose_reduction'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                    : selectedAgent.toLowerCase() === drug.toLowerCase()
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ring-2 ring-blue-500'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setSelectedAgent(drug)}
                  className="hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{drug}</span>
                  {alert.type === 'contraindicated' && <span>🚫</span>}
                  {alert.type === 'dose_reduction' && <span>⚠️</span>}
                </button>
                {regimen.length > 1 && (
                  <button
                    onClick={() => handleRemoveDrug(drug)}
                    className="p-0.5 hover:bg-rose-500 hover:text-white rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}

          <form
            onSubmit={e => {
              e.preventDefault();
              handleAddDrug(newDrugInput);
            }}
            className="inline-flex items-center gap-1.5"
          >
            <input
              type="text"
              value={newDrugInput}
              onChange={e => setNewDrugInput(e.target.value)}
              placeholder="Add drug (e.g. Clopidogrel)..."
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!newDrugInput.trim()}
              className="p-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Control Bar: Severity Filters & Canvas Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mr-1 shrink-0">
            Filter Severity:
          </span>
          {[
            { id: 'all', label: 'All Risks', color: 'bg-slate-200 text-slate-800' },
            { id: 'major', label: 'Major (Red)', color: 'bg-rose-100 text-rose-800' },
            { id: 'moderate', label: 'Moderate (Amber)', color: 'bg-amber-100 text-amber-800' },
            { id: 'minor', label: 'Minor (Blue)', color: 'bg-blue-100 text-blue-800' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSeverityFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                severityFilter === f.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-300 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs shadow-2xs"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs shadow-2xs"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main D3 Canvas Area */}
      <div ref={containerRef} className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner min-h-[480px]">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#38BDF8 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <svg ref={svgRef} className="w-full h-[480px] cursor-grab active:cursor-grabbing" />

        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] text-slate-300 flex items-center gap-2 pointer-events-none shadow-md">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Nodes with 🚫/⚠️ have physiological age/weight adjustments • Drag nodes • Click for mechanisms</span>
        </div>

        <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl text-[10px] text-slate-300 space-y-1.5 shadow-lg">
          <div className="font-bold text-slate-200 mb-1 border-b border-slate-800 pb-1">
            Node Halo Halo Physiological Ring Legend
          </div>
          <div className="grid grid-cols-1 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-dashed border-rose-500 inline-block" />
              <span className="text-rose-300 font-bold">🚫 Contraindicated (Beers/CrCl)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-amber-500 inline-block" />
              <span className="text-amber-300 font-bold">⚠️ Dose Reduction Needed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-sky-400 inline-block" />
              <span className="text-sky-300">Standard Dosing Range</span>
            </div>
          </div>
        </div>
      </div>

      {/* Physiological Adjustments Summary Table for Regimen */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold tracking-wide uppercase text-slate-200">
              Physiological Dose Adjustments & Contraindications Log
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Age: {age}y | Mass: {weight}kg | CrCl: {estCrCl} mL/min
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {regimenAdjustments.map(alert => (
            <div
              key={alert.drugName}
              className={`p-3 rounded-xl border space-y-1.5 ${
                alert.type === 'contraindicated'
                  ? 'bg-rose-950/60 border-rose-800/80 text-rose-200'
                  : alert.type === 'dose_reduction'
                  ? 'bg-amber-950/60 border-amber-800/80 text-amber-200'
                  : alert.type === 'precaution'
                  ? 'bg-blue-950/60 border-blue-800/80 text-blue-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-extrabold text-sm text-white flex items-center gap-1">
                  {alert.drugName}
                  {alert.type === 'contraindicated' && <span>🚫</span>}
                  {alert.type === 'dose_reduction' && <span>⚠️</span>}
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    alert.type === 'contraindicated'
                      ? 'bg-rose-500 text-white'
                      : alert.type === 'dose_reduction'
                      ? 'bg-amber-500 text-slate-950'
                      : alert.type === 'precaution'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {alert.badgeText}
                </span>
              </div>

              <div className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                <span>Trigger:</span> <span>{alert.trigger}</span>
              </div>

              <div className="p-2 bg-slate-950/50 rounded-lg text-xs font-semibold leading-snug">
                <span className="text-emerald-400 font-bold block text-[10px] uppercase">Recommended Adjustment:</span>
                {alert.adjustedDosing}
              </div>

              <p className="text-[11px] opacity-90 leading-normal">{alert.reasoning}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inspector Panel for Selected Node / Interaction Edge */}
      {(selectedLink || selectedNode) && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold tracking-wide uppercase text-slate-200">
                Focused Clinical Inspector
              </h4>
            </div>
            {selectedLink && (
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  selectedLink.severity === 'major'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : selectedLink.severity === 'moderate'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
              >
                {selectedLink.severity} Interaction Risk
              </span>
            )}
          </div>

          {selectedLink ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Agents Involved</div>
                <div className="font-bold text-cyan-300 text-sm">
                  {typeof selectedLink.source === 'object' ? selectedLink.source.name : selectedLink.source} +{' '}
                  {typeof selectedLink.target === 'object' ? selectedLink.target.name : selectedLink.target}
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 md:col-span-2 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Pharmacodynamic / Enzyme Mechanism</div>
                <p className="text-slate-200 leading-normal">{selectedLink.mechanism}</p>
              </div>

              <div className="p-3 bg-rose-950/50 rounded-xl border border-rose-800/50 text-rose-200 md:col-span-3 space-y-1">
                <div className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Clinical Impact & Risk
                </div>
                <p className="leading-relaxed text-xs">{selectedLink.clinicalImpact}</p>
              </div>

              <div className="p-3 bg-emerald-950/50 rounded-xl border border-emerald-800/50 text-emerald-200 md:col-span-3 space-y-1">
                <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Management & Monitoring Strategy
                </div>
                <p className="leading-relaxed text-xs">{selectedLink.recommendation}</p>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-2">
              <div className="font-bold text-sm text-cyan-300">{selectedNode.name}</div>
              <div className="text-slate-400">Class: {selectedNode.class}</div>
              {(() => {
                const nodeAlert = evaluatePhysiologicalAdjustments(selectedNode.name, age, weight);
                return (
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-xs space-y-1">
                    <div className="font-bold text-amber-300 text-[11px] uppercase">
                      Physiological Status: {nodeAlert.badgeText}
                    </div>
                    <p className="text-slate-200">{nodeAlert.adjustedDosing}</p>
                    <p className="text-[10px] text-slate-400">{nodeAlert.reasoning}</p>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
