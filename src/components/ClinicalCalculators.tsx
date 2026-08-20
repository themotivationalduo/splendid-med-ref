import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { showToast } from './Toast';
import {
  Calculator,
  Activity,
  Droplet,
  Heart,
  Scale,
  Pill,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ChevronDown,
  X,
  Baby,
  Copy,
  ShieldAlert
} from 'lucide-react';

export interface PedsDrugPreset {
  id: string;
  name: string;
  brand: string;
  doseMgKg: number;
  minMgKg: number;
  maxMgKg: number;
  frequency: number;
  freqLabel: string;
  defaultConcMg: number;
  defaultConcMl: number;
  maxSingleAdultDoseMg: number;
  minAgeMonths: number;
  warningNote: string;
  indication: string;
}

const PEDS_DRUG_PRESETS: PedsDrugPreset[] = [
  {
    id: 'acetaminophen',
    name: 'Acetaminophen',
    brand: 'Children\'s Tylenol',
    doseMgKg: 15,
    minMgKg: 10,
    maxMgKg: 15,
    frequency: 4,
    freqLabel: 'Q4-6H (Max 5 doses/24h)',
    defaultConcMg: 160,
    defaultConcMl: 5,
    maxSingleAdultDoseMg: 1000,
    minAgeMonths: 0,
    warningNote: 'Do not exceed 75 mg/kg/day or 4,000 mg/day total from all sources.',
    indication: 'Fever reduction & mild-to-moderate pediatric analgesia'
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    brand: 'Children\'s Motrin / Advil',
    doseMgKg: 10,
    minMgKg: 5,
    maxMgKg: 10,
    frequency: 3,
    freqLabel: 'Q6-8H (Max 4 doses/24h)',
    defaultConcMg: 100,
    defaultConcMl: 5,
    maxSingleAdultDoseMg: 800,
    minAgeMonths: 6,
    warningNote: 'CONTRAINDICATED in infants under 6 months due to acute renal failure and GI toxicity risks.',
    indication: 'Inflammation, fever, & musculoskeletal pediatric pain'
  },
  {
    id: 'amoxicillin',
    name: 'Amoxicillin (High-Dose AOM)',
    brand: 'Amoxil Suspension',
    doseMgKg: 45,
    minMgKg: 25,
    maxMgKg: 45,
    frequency: 2,
    freqLabel: 'BID (Every 12 hours x 10 days)',
    defaultConcMg: 400,
    defaultConcMl: 5,
    maxSingleAdultDoseMg: 1000,
    minAgeMonths: 3,
    warningNote: 'High-dose 90 mg/kg/day regimen for acute otitis media. Shake oral suspension well before each dose.',
    indication: 'Acute otitis media, streptococcal pharyngitis, pneumonia'
  },
  {
    id: 'diphenhydramine',
    name: 'Diphenhydramine',
    brand: 'Children\'s Benadryl',
    doseMgKg: 1.25,
    minMgKg: 1.0,
    maxMgKg: 1.25,
    frequency: 4,
    freqLabel: 'Q6H (Max 300 mg/day)',
    defaultConcMg: 12.5,
    defaultConcMl: 5,
    maxSingleAdultDoseMg: 50,
    minAgeMonths: 24,
    warningNote: 'Avoid in children < 2 years without explicit specialist supervision due to respiratory depression risks.',
    indication: 'Allergic rhinitis, acute urticaria, & anaphylaxis adjunctive therapy'
  },
  {
    id: 'azithromycin',
    name: 'Azithromycin',
    brand: 'Zithromax Liquid',
    doseMgKg: 10,
    minMgKg: 5,
    maxMgKg: 10,
    frequency: 1,
    freqLabel: 'Once Daily (Day 1: 10 mg/kg, Days 2-5: 5 mg/kg)',
    defaultConcMg: 200,
    defaultConcMl: 5,
    maxSingleAdultDoseMg: 500,
    minAgeMonths: 6,
    warningNote: 'Take with or without food. Monitor for QT prolongation if co-prescribed with antiarrhythmics.',
    indication: 'Atypical community-acquired pneumonia, acute bacterial sinusitis'
  },
  {
    id: 'custom',
    name: 'Custom Pediatric Protocol',
    brand: 'Custom Concentration Formulary',
    doseMgKg: 10,
    minMgKg: 1,
    maxMgKg: 100,
    frequency: 3,
    freqLabel: 'TID',
    defaultConcMg: 100,
    defaultConcMl: 5,
    maxSingleAdultDoseMg: 500,
    minAgeMonths: 0,
    warningNote: 'Custom dosing protocol — verify with local hospital pediatric formulary.',
    indication: 'Custom clinician specified protocol'
  }
];

export function ClinicalCalculators() {
  const [activeCalc, setActiveCalc] = useState<'peds' | 'bmi' | 'egfr' | 'drip' | 'map' | 'dosage'>('peds');
  const [calcSearch, setCalcSearch] = useState<string>('');

  // Pediatric Dosage Calculator State
  const [pedsAgeVal, setPedsAgeVal] = useState<number>(2);
  const [pedsAgeUnit, setPedsAgeUnit] = useState<'months' | 'years'>('years');
  const [pedsWeightVal, setPedsWeightVal] = useState<number>(12);
  const [pedsWeightUnit, setPedsWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [pedsDrugId, setPedsDrugId] = useState<string>('acetaminophen');
  const [pedsCustomDoseMgKg, setPedsCustomDoseMgKg] = useState<number>(15);
  const [pedsCustomFreq, setPedsCustomFreq] = useState<number>(4);
  const [pedsConcMg, setPedsConcMg] = useState<number>(160);
  const [pedsConcMl, setPedsConcMl] = useState<number>(5);
  const [pedsCustomMaxCap, setPedsCustomMaxCap] = useState<number>(1000);

  // Helper to handle switching pediatric drug presets
  const handleSelectPedsDrug = (drugId: string) => {
    setPedsDrugId(drugId);
    const preset = PEDS_DRUG_PRESETS.find(p => p.id === drugId);
    if (preset) {
      setPedsConcMg(preset.defaultConcMg);
      setPedsConcMl(preset.defaultConcMl);
      setPedsCustomDoseMgKg(preset.doseMgKg);
      setPedsCustomFreq(preset.frequency);
      setPedsCustomMaxCap(preset.maxSingleAdultDoseMg);
      showToast(`Selected ${preset.name} (${preset.brand})`, "👶", "info");
    }
  };

  // Pediatric Dosage Calculation Engine
  const calculatePedsDosage = () => {
    const ageMonths = pedsAgeUnit === 'years' ? pedsAgeVal * 12 : pedsAgeVal;
    const weightKg = pedsWeightUnit === 'lbs' ? pedsWeightVal * 0.45359237 : pedsWeightVal;

    const currentPreset = PEDS_DRUG_PRESETS.find(p => p.id === pedsDrugId) || PEDS_DRUG_PRESETS[0];

    const doseMgKg = pedsDrugId === 'custom' ? pedsCustomDoseMgKg : currentPreset.doseMgKg;
    const maxAdultCap = pedsDrugId === 'custom' ? pedsCustomMaxCap : currentPreset.maxSingleAdultDoseMg;
    const minAgeM = currentPreset.minAgeMonths;

    if (weightKg <= 0 || ageMonths <= 0 || pedsConcMg <= 0 || pedsConcMl <= 0 || doseMgKg <= 0) {
      return {
        weightKg: 0,
        ageMonths: 0,
        doseMgKg: 0,
        calculatedMgDose: 0,
        finalMgDose: 0,
        volumeMl: 0,
        teaspoons: 0,
        dailyTotalMg: 0,
        dailyTotalMl: 0,
        isCapped: false,
        isContraindicated: false,
        warningReason: 'Invalid input parameters.',
        concMgPerMl: 0,
        currentPreset
      };
    }

    const concMgPerMl = pedsConcMg / pedsConcMl;
    const calculatedMgDose = weightKg * doseMgKg;
    const isCapped = calculatedMgDose > maxAdultCap;
    const finalMgDose = isCapped ? maxAdultCap : calculatedMgDose;
    const volumeMl = finalMgDose / concMgPerMl;
    const teaspoons = volumeMl / 5;
    const frequency = pedsDrugId === 'custom' ? pedsCustomFreq : currentPreset.frequency;
    const dailyTotalMg = finalMgDose * frequency;
    const dailyTotalMl = volumeMl * frequency;
    const isContraindicated = ageMonths < minAgeM;

    let warningReason = '';
    if (isContraindicated) {
      warningReason = `CONTRAINDICATED in children under ${minAgeM >= 12 ? `${minAgeM / 12} years` : `${minAgeM} months`}. ${currentPreset.warningNote}`;
    } else if (isCapped) {
      warningReason = `Calculated dose (${Math.round(calculatedMgDose)} mg) exceeded single adult maximum cap (${maxAdultCap} mg). Final dose restricted to ${maxAdultCap} mg.`;
    } else {
      warningReason = currentPreset.warningNote;
    }

    return {
      weightKg: Math.round(weightKg * 10) / 10,
      ageMonths,
      doseMgKg,
      calculatedMgDose: Math.round(calculatedMgDose * 10) / 10,
      finalMgDose: Math.round(finalMgDose * 10) / 10,
      volumeMl: Math.round(volumeMl * 100) / 100,
      teaspoons: Math.round(teaspoons * 10) / 10,
      dailyTotalMg: Math.round(dailyTotalMg * 10) / 10,
      dailyTotalMl: Math.round(dailyTotalMl * 10) / 10,
      isCapped,
      isContraindicated,
      warningReason,
      concMgPerMl: Math.round(concMgPerMl * 10) / 10,
      currentPreset
    };
  };

  const handleCopyPedsPrescription = () => {
    const res = calculatePedsDosage();
    const summary = `PEDIATRIC DOSAGE CALCULATION SUMMARY
----------------------------------------
Patient Age: ${pedsAgeVal} ${pedsAgeUnit} (${res.ageMonths} months)
Patient Weight: ${pedsWeightVal} ${pedsWeightUnit} (${res.weightKg} kg)
Medication: ${res.currentPreset.name} (${res.currentPreset.brand})
Concentration: ${pedsConcMg} mg / ${pedsConcMl} mL (${res.concMgPerMl} mg/mL)

RECOMMENDED DOSAGE:
• Dose per Administration: ${res.finalMgDose} mg (${res.volumeMl} mL / ${res.teaspoons} tsp)
• Administration Schedule: ${res.currentPreset.freqLabel}
• Total Daily Volume: ${res.dailyTotalMl} mL/day (${res.dailyTotalMg} mg/day)

CLINICAL GUIDELINES & SAFETY STATUS:
• Safety Status: ${res.isContraindicated ? 'CONTRAINDICATED (Age Risk)' : res.isCapped ? 'ADULT MAXIMUM CAP APPLIED' : 'SAFE PEDIATRIC RANGE'}
• Guideline Note: ${res.warningReason}`;

    navigator.clipboard.writeText(summary);
    showToast("Pediatric Rx dosing summary copied to clipboard!", "📋", "success");
  };

  // BMI State
  const [bmiUnit, setBmiUnit] = useState<'metric' | 'imperial'>('metric');
  const [weight, setWeight] = useState<number>(70);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(9);
  const [weightLbs, setWeightLbs] = useState<number>(154);

  // eGFR State
  const [scr, setScr] = useState<number>(1.0);
  const [age, setAge] = useState<number>(45);
  const [sex, setSex] = useState<'male' | 'female'>('female');

  // IV Drip Rate State
  const [volume, setVolume] = useState<number>(1000); // mL
  const [timeVal, setTimeVal] = useState<number>(8); // hours
  const [timeUnit, setTimeUnit] = useState<'hours' | 'mins'>('hours');
  const [dropFactor, setDropFactor] = useState<number>(20); // gtt/mL (10, 15, 20, 60)

  // MAP State
  const [sbp, setSbp] = useState<number>(120);
  const [dbp, setDbp] = useState<number>(80);

  // Dosage State
  const [ptWeight, setPtWeight] = useState<number>(20); // kg
  const [doseMgKg, setDoseMgKg] = useState<number>(10); // mg/kg
  const [dosesPerDay, setDosesPerDay] = useState<number>(3); // 3 times daily

  // --- BMI Calculation ---
  const calculateBMI = () => {
    let w = weight;
    let hMeters = heightCm / 100;

    if (bmiUnit === 'imperial') {
      w = weightLbs * 0.45359237;
      const totalInches = heightFt * 12 + heightIn;
      hMeters = totalInches * 0.0254;
    }

    if (hMeters <= 0 || w <= 0) return { bmi: 0, category: 'Invalid Input', color: 'text-slate-400', bg: 'bg-slate-100' };

    const bmi = w / (hMeters * hMeters);
    let category = '';
    let color = '';
    let bg = '';

    if (bmi < 18.5) {
      category = 'Underweight';
      color = 'text-blue-600';
      bg = 'bg-blue-50 border-blue-200';
    } else if (bmi < 25) {
      category = 'Normal Weight';
      color = 'text-emerald-600';
      bg = 'bg-emerald-50 border-emerald-200';
    } else if (bmi < 30) {
      category = 'Overweight';
      color = 'text-amber-600';
      bg = 'bg-amber-50 border-amber-200';
    } else if (bmi < 35) {
      category = 'Class I Obesity';
      color = 'text-orange-600';
      bg = 'bg-orange-50 border-orange-200';
    } else if (bmi < 40) {
      category = 'Class II Obesity';
      color = 'text-rose-600';
      bg = 'bg-rose-50 border-rose-200';
    } else {
      category = 'Class III Severe Obesity';
      color = 'text-purple-600';
      bg = 'bg-purple-50 border-purple-200';
    }

    return { bmi: bmi.toFixed(1), category, color, bg };
  };

  // --- eGFR Calculation (CKD-EPI 2021) ---
  const calculateeGFR = () => {
    if (scr <= 0 || age <= 0) return { egfr: 0, stage: 'Invalid', desc: 'Please enter valid values' };

    const kappa = sex === 'female' ? 0.7 : 0.9;
    const alpha = sex === 'female' ? -0.241 : -0.302;
    const sexFactor = sex === 'female' ? 1.012 : 1.0;

    const minScrKa = Math.min(scr / kappa, 1);
    const maxScrKa = Math.max(scr / kappa, 1);

    const egfrVal =
      142 *
      Math.pow(minScrKa, alpha) *
      Math.pow(maxScrKa, -1.2) *
      Math.pow(0.9938, age) *
      sexFactor;

    let stage = '';
    let desc = '';
    let color = '';

    if (egfrVal >= 90) {
      stage = 'G1: Normal or High';
      desc = 'Normal kidney function';
      color = 'text-emerald-600';
    } else if (egfrVal >= 60) {
      stage = 'G2: Mildly Decreased';
      desc = 'Mild reduction related to normal aging or mild CKD';
      color = 'text-teal-600';
    } else if (egfrVal >= 45) {
      stage = 'G3a: Mildly to Moderately Decreased';
      desc = 'Moderate kidney damage';
      color = 'text-amber-600';
    } else if (egfrVal >= 30) {
      stage = 'G3b: Moderately to Severely Decreased';
      desc = 'Substantial kidney damage';
      color = 'text-orange-600';
    } else if (egfrVal >= 15) {
      stage = 'G4: Severely Decreased';
      desc = 'Severe reduction in kidney function';
      color = 'text-rose-600';
    } else {
      stage = 'G5: Kidney Failure';
      desc = 'End-stage renal disease (ESRD)';
      color = 'text-purple-600';
    }

    return { egfr: Math.round(egfrVal), stage, desc, color };
  };

  // --- Drip Rate Calculation ---
  const calculateDripRate = () => {
    const totalMinutes = timeUnit === 'hours' ? timeVal * 60 : timeVal;
    if (totalMinutes <= 0 || volume <= 0 || dropFactor <= 0) return { gttMin: 0, mlHr: 0, secPerDrop: 0 };

    const mlHr = (volume / totalMinutes) * 60;
    const gttMin = (volume * dropFactor) / totalMinutes;
    const secPerDrop = gttMin > 0 ? 60 / gttMin : 0;

    return { 
      gttMin: Math.round(gttMin), 
      mlHr: Math.round(mlHr * 10) / 10,
      secPerDrop: Math.round(secPerDrop * 10) / 10
    };
  };

  // --- MAP Calculation ---
  const calculateMAP = () => {
    if (sbp <= 0 || dbp <= 0) return { map: 0, status: 'Invalid', color: 'text-slate-400' };

    const mapVal = dbp + (sbp - dbp) / 3;
    let status = '';
    let color = '';

    if (mapVal < 65) {
      status = 'Inadequate Perfusion (< 65 mmHg)';
      color = 'text-rose-600';
    } else if (mapVal <= 100) {
      status = 'Optimal Organ Perfusion (65 - 100 mmHg)';
      color = 'text-emerald-600';
    } else {
      status = 'Elevated Arterial Pressure (> 100 mmHg)';
      color = 'text-amber-600';
    }

    return { map: Math.round(mapVal), status, color };
  };

  // --- Dosage Calculation ---
  const calculateDosage = () => {
    if (ptWeight <= 0 || doseMgKg <= 0) return { totalDaily: 0, perDose: 0 };

    const totalDaily = ptWeight * doseMgKg;
    const perDose = dosesPerDay > 0 ? totalDaily / dosesPerDay : totalDaily;

    return { totalDaily: Math.round(totalDaily * 10) / 10, perDose: Math.round(perDose * 10) / 10 };
  };

  const bmiResult = calculateBMI();
  const egfrResult = calculateeGFR();
  const dripResult = calculateDripRate();
  const mapResult = calculateMAP();
  const dosageResult = calculateDosage();
  const pedsDrugResult = calculatePedsDosage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Header Banner */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-slate-900 dark:text-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg">
              <Calculator className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Clinical Decision Calculators</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Rapid point-of-care tools for pediatric dosing, anthropometry, renal function, infusion rate, and pharmacology.
          </p>
        </div>

        {/* Drop-Down Tool Selector & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Drop-down Tool Select */}
          <div className="relative w-full sm:w-60">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/90 dark:bg-slate-800/90 border border-blue-200/80 dark:border-slate-700 rounded-lg text-xs font-semibold text-blue-900 dark:text-blue-200 shadow-2xs">
              <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 shrink-0">Tool:</span>
              <select
                id="clinical-tool-select"
                aria-label="Select Clinical Tool"
                value={activeCalc}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setActiveCalc(val);
                  const toolToasts: Record<string, { title: string; emoji: string }> = {
                    peds: { title: "Pediatric Dosage Calculator", emoji: "👶" },
                    bmi: { title: "BMI & Body Composition", emoji: "⚖️" },
                    egfr: { title: "eGFR CKD-EPI (Renal)", emoji: "🧪" },
                    drip: { title: "IV Drip Infusion Rate", emoji: "💧" },
                    map: { title: "Mean Arterial Pressure (MAP)", emoji: "🫀" },
                    dosage: { title: "Weight-Based Medication Dosing", emoji: "💊" },
                  };
                  const t = toolToasts[val];
                  if (t) showToast(`Loaded ${t.title}`, t.emoji, "info");
                }}
                className="w-full bg-transparent text-xs font-bold text-blue-950 dark:text-white focus:outline-none cursor-pointer truncate pr-1"
              >
                {[
                  { id: 'peds', label: 'Pediatric Dosage Calculator 👶' },
                  { id: 'bmi', label: 'BMI & Body Composition' },
                  { id: 'egfr', label: 'eGFR CKD-EPI (Renal)' },
                  { id: 'drip', label: 'IV Drip Infusion Rate' },
                  { id: 'map', label: 'Mean Arterial Pressure (MAP)' },
                  { id: 'dosage', label: 'Weight-Based Dosing' },
                ]
                  .filter(tool => !calcSearch.trim() || tool.label.toLowerCase().includes(calcSearch.toLowerCase()))
                  .map(tool => (
                    <option key={tool.id} value={tool.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {tool.label}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 pointer-events-none" />
            </div>
          </div>

          {/* Quick Search Tool Filter */}
          <div className="relative w-full sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tools..."
              value={calcSearch}
              onChange={(e) => setCalcSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {calcSearch && (
              <button onClick={() => setCalcSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE CALCULATOR DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 0. PEDIATRIC DOSAGE CALCULATOR */}
        {activeCalc === 'peds' && (
          <>
            <div className="md:col-span-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Baby className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Pediatric Dosage Calculator
                </h3>
                <span className="text-[10px] bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded font-bold border border-cyan-100 dark:border-cyan-900/50">
                  AAP & FDA Guidelines
                </span>
              </div>

              {/* 1. Patient Age & Weight Inputs */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">1. Patient Metrics (Age & Mass)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Age */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <label htmlFor="peds-age-input">Patient Age</label>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-[10px]">
                        <button
                          onClick={() => setPedsAgeUnit('months')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors ${pedsAgeUnit === 'months' ? 'bg-cyan-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          Months
                        </button>
                        <button
                          onClick={() => setPedsAgeUnit('years')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors ${pedsAgeUnit === 'years' ? 'bg-cyan-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          Years
                        </button>
                      </div>
                    </div>
                    <input
                      id="peds-age-input"
                      type="number"
                      min="0.1"
                      step={pedsAgeUnit === 'months' ? '1' : '0.5'}
                      value={pedsAgeVal}
                      onChange={e => setPedsAgeVal(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {/* Age Presets */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {[
                        { label: '6 mos', val: 6, unit: 'months', w: 7.5 },
                        { label: '1 yr', val: 1, unit: 'years', w: 10 },
                        { label: '2 yrs', val: 2, unit: 'years', w: 12 },
                        { label: '4 yrs', val: 4, unit: 'years', w: 16 },
                        { label: '6 yrs', val: 6, unit: 'years', w: 20 },
                        { label: '10 yrs', val: 10, unit: 'years', w: 32 }
                      ].map(a => (
                        <button
                          key={a.label}
                          onClick={() => {
                            setPedsAgeVal(a.val);
                            setPedsAgeUnit(a.unit as any);
                            setPedsWeightVal(a.w);
                            setPedsWeightUnit('kg');
                            showToast(`Set age to ${a.label} (~${a.w} kg)`, "👶", "info");
                          }}
                          className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                            pedsAgeVal === a.val && pedsAgeUnit === a.unit
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <label htmlFor="peds-weight-input">Patient Weight</label>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-[10px]">
                        <button
                          onClick={() => setPedsWeightUnit('kg')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors ${pedsWeightUnit === 'kg' ? 'bg-cyan-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          kg
                        </button>
                        <button
                          onClick={() => setPedsWeightUnit('lbs')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-colors ${pedsWeightUnit === 'lbs' ? 'bg-cyan-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          lbs
                        </button>
                      </div>
                    </div>
                    <input
                      id="peds-weight-input"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={pedsWeightVal}
                      onChange={e => setPedsWeightVal(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {/* Weight Presets */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {[6, 10, 15, 20, 30, 40].map(w => (
                        <button
                          key={w}
                          onClick={() => {
                            setPedsWeightVal(w);
                            setPedsWeightUnit('kg');
                          }}
                          className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                            pedsWeightVal === w && pedsWeightUnit === 'kg'
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {w} kg
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Medication Selection */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">2. Select Pediatric Medication</div>
                
                {/* Drug Quick Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {PEDS_DRUG_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPedsDrug(preset.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                        pedsDrugId === preset.id
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                      }`}
                    >
                      <Pill className="w-3 h-3" />
                      {preset.name}
                    </button>
                  ))}
                </div>

                {/* Selected Drug Info Bar */}
                {pedsDrugResult.currentPreset && (
                  <div className="p-2.5 bg-cyan-50/60 dark:bg-slate-800/80 border border-cyan-200/80 dark:border-slate-700 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-900 dark:text-cyan-200">{pedsDrugResult.currentPreset.name} ({pedsDrugResult.currentPreset.brand})</span>
                      <span className="text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 px-1.5 py-0.5 rounded font-bold">
                        Target: {pedsDrugResult.currentPreset.doseMgKg} mg/kg
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Indication:</span> {pedsDrugResult.currentPreset.indication}
                    </p>
                  </div>
                )}

                {/* 3. Concentration & Custom Dosing Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Concentration Amount */}
                  <div className="space-y-1">
                    <label htmlFor="peds-conc-mg" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Liquid Conc. (mg)</label>
                    <input
                      id="peds-conc-mg"
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={pedsConcMg}
                      onChange={e => setPedsConcMg(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Concentration Volume */}
                  <div className="space-y-1">
                    <label htmlFor="peds-conc-ml" className="text-xs font-semibold text-slate-700 dark:text-slate-200">per Volume (mL)</label>
                    <input
                      id="peds-conc-ml"
                      type="number"
                      step="0.25"
                      min="0.1"
                      value={pedsConcMl}
                      onChange={e => setPedsConcMl(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Calculated Concentration Density */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Effective Strength</label>
                    <div className="px-3 py-2 text-sm bg-cyan-50/80 dark:bg-slate-800/90 border border-cyan-200 dark:border-slate-700 rounded-lg font-mono font-bold text-cyan-900 dark:text-cyan-200 flex items-center justify-between">
                      <span>{pedsDrugResult.concMgPerMl} mg/mL</span>
                      <span className="text-[10px] font-normal text-slate-500">Strength</span>
                    </div>
                  </div>
                </div>

                {/* Concentration Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Standard Formulations:</span>
                  {[
                    { label: '160mg/5mL (Tylenol)', mg: 160, ml: 5 },
                    { label: '100mg/5mL (Motrin)', mg: 100, ml: 5 },
                    { label: '50mg/1.25mL (Infant Motrin)', mg: 50, ml: 1.25 },
                    { label: '250mg/5mL (Amoxil)', mg: 250, ml: 5 },
                    { label: '400mg/5mL (Amoxil ES)', mg: 400, ml: 5 },
                    { label: '12.5mg/5mL (Benadryl)', mg: 12.5, ml: 5 }
                  ].map(c => (
                    <button
                      key={c.label}
                      onClick={() => {
                        setPedsConcMg(c.mg);
                        setPedsConcMl(c.ml);
                        showToast(`Set formulation to ${c.label}`, "🧪", "info");
                      }}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                        pedsConcMg === c.mg && pedsConcMl === c.ml
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Target Dose Override for Custom */}
                {pedsDrugId === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label htmlFor="peds-target-mgkg" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Target Dose (mg / kg / dose)</label>
                      <input
                        id="peds-target-mgkg"
                        type="number"
                        step="0.5"
                        min="0.1"
                        value={pedsCustomDoseMgKg}
                        onChange={e => setPedsCustomDoseMgKg(Math.max(0.1, Number(e.target.value)))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="peds-max-adult-cap" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Max Single Adult Dose Cap (mg)</label>
                      <input
                        id="peds-max-adult-cap"
                        type="number"
                        step="50"
                        min="1"
                        value={pedsCustomMaxCap}
                        onChange={e => setPedsCustomMaxCap(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step-by-Step Calculation Formula Box */}
              <div className="p-3 bg-cyan-50/70 dark:bg-slate-800/80 border border-cyan-200/70 dark:border-slate-700 rounded-lg text-xs space-y-1.5 text-slate-700 dark:text-slate-200">
                <div className="font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Standardized Pediatric Formula Breakdown:
                </div>
                <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 pl-3">
                  1. Target Dose = {pedsDrugResult.weightKg} kg × {pedsDrugResult.doseMgKg} mg/kg = <span className="font-bold text-cyan-800 dark:text-cyan-200">{pedsDrugResult.calculatedMgDose} mg</span>
                  {pedsDrugResult.isCapped && <span className="text-amber-600 font-bold ml-1">(Capped to adult max: {pedsDrugResult.finalMgDose} mg)</span>}
                </div>
                <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 pl-3">
                  2. Administer Volume = {pedsDrugResult.finalMgDose} mg ÷ {pedsDrugResult.concMgPerMl} mg/mL = <span className="font-bold text-cyan-800 dark:text-cyan-200 underline">{pedsDrugResult.volumeMl} mL</span> ({pedsDrugResult.teaspoons} tsp)
                </div>
              </div>
            </div>

            {/* Pediatric Dose Results Banner Box */}
            <div className="p-5 bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 text-white rounded-xl shadow-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">Calculated Dose</span>
                  <button
                    onClick={handleCopyPedsPrescription}
                    className="flex items-center gap-1 px-2 py-1 bg-white/15 hover:bg-white/25 rounded text-[10px] font-bold transition-colors text-white cursor-pointer"
                    title="Copy prescription summary"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Summary
                  </button>
                </div>

                {/* Primary Volume Display */}
                <div className="mt-3">
                  <div className="text-3xl font-black tracking-tight">{pedsDrugResult.volumeMl} <span className="text-base font-semibold text-cyan-200">mL / dose</span></div>
                  <div className="text-xs text-cyan-100 font-medium mt-0.5">
                    Oral Liquid Syringe Volume ({pedsDrugResult.teaspoons} tsp)
                  </div>
                </div>

                {/* Dose Breakdown Metrics */}
                <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xl font-bold">{pedsDrugResult.finalMgDose} <span className="text-xs font-normal text-cyan-200">mg</span></div>
                    <div className="text-[10px] text-cyan-200 font-medium">Mg per Single Dose</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{pedsDrugResult.dailyTotalMl} <span className="text-xs font-normal text-cyan-200">mL/day</span></div>
                    <div className="text-[10px] text-cyan-200 font-medium">Daily Volume Total</div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] font-semibold text-cyan-100">
                  Schedule: {pedsDrugResult.currentPreset.freqLabel}
                </div>
              </div>

              {/* Safety Warning Banner */}
              <div className="pt-3 border-t border-white/20">
                {pedsDrugResult.isContraindicated ? (
                  <div className="p-2.5 bg-rose-500/30 border border-rose-300/50 rounded-lg text-xs space-y-1 text-rose-100">
                    <div className="font-bold flex items-center gap-1.5 text-rose-200">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-300" />
                      CONTRAINDICATED FOR AGE
                    </div>
                    <p className="text-[11px] leading-tight">{pedsDrugResult.warningReason}</p>
                  </div>
                ) : pedsDrugResult.isCapped ? (
                  <div className="p-2.5 bg-amber-500/30 border border-amber-300/50 rounded-lg text-xs space-y-1 text-amber-100">
                    <div className="font-bold flex items-center gap-1.5 text-amber-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                      MAX ADULT CAP APPLIED
                    </div>
                    <p className="text-[11px] leading-tight">{pedsDrugResult.warningReason}</p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-500/25 border border-emerald-300/40 rounded-lg text-xs space-y-1 text-emerald-100">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
                      SAFE PEDIATRIC RANGE
                    </div>
                    <p className="text-[11px] leading-tight text-emerald-100/90">{pedsDrugResult.warningReason}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 1. BMI CALCULATOR */}
        {activeCalc === 'bmi' && (
          <>
            <div className="md:col-span-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Body Mass Index (BMI)
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setBmiUnit('metric')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      bmiUnit === 'metric' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Metric (kg / cm)
                  </button>
                  <button
                    onClick={() => setBmiUnit('imperial')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      bmiUnit === 'imperial' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Imperial (lbs / ft-in)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bmiUnit === 'metric' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Body Weight (kg)</label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={weight}
                        onChange={e => setWeight(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Height (cm)</label>
                      <input
                        type="number"
                        min="30"
                        max="250"
                        value={heightCm}
                        onChange={e => setHeightCm(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Body Weight (lbs)</label>
                      <input
                        type="number"
                        min="1"
                        max="700"
                        value={weightLbs}
                        onChange={e => setWeightLbs(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Height (Feet & Inches)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max="8"
                          value={heightFt}
                          onChange={e => setHeightFt(Number(e.target.value))}
                          placeholder="ft"
                          className="w-1/2 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min="0"
                          max="11"
                          value={heightIn}
                          onChange={e => setHeightIn(Number(e.target.value))}
                          placeholder="in"
                          className="w-1/2 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* BMI Reference Scale */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">WHO Weight Classification Ranges:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900/50">
                    <span className="font-bold block">&lt; 18.5</span> Underweight
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-900/50">
                    <span className="font-bold block">18.5 – 24.9</span> Normal Weight
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-900/50">
                    <span className="font-bold block">25.0 – 29.9</span> Overweight
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-100 dark:border-rose-900/50">
                    <span className="font-bold block">≥ 30.0</span> Obesity
                  </div>
                </div>
              </div>
            </div>

            {/* BMI Result Box */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between dark:bg-slate-900/90 ${bmiResult.bg}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">BMI Result</span>
                <div className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{bmiResult.bmi} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">kg/m²</span></div>
                <div className={`mt-2 text-sm font-bold ${bmiResult.color} flex items-center gap-1.5`}>
                  <CheckCircle2 className="w-4 h-4" /> {bmiResult.category}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                <Info className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                BMI is an anthropometric indicator. Interpret alongside muscle mass, fluid balance, and clinical context.
              </div>
            </div>
          </>
        )}

        {/* 2. eGFR CALCULATOR */}
        {activeCalc === 'egfr' && (
          <>
            <div className="md:col-span-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Glomerular Filtration Rate (eGFR - CKD-EPI 2021)
                </h3>
                <span className="text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded font-bold border border-teal-100 dark:border-teal-900/50">Race-Free Formula</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Serum Creatinine (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="15"
                    value={scr}
                    onChange={e => setScr(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Age (years)</label>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Biological Sex</label>
                  <select
                    value={sex}
                    onChange={e => setSex(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-800 dark:text-slate-100">CKD-EPI 2021 Equation:</span> Evaluates estimated glomerular filtration rate without race variables. Required for renally cleared drug dosage adjustments.
              </div>
            </div>

            {/* eGFR Result Box */}
            <div className="p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-teal-200/80 dark:border-teal-900/50 rounded-xl shadow-sm flex flex-col justify-between text-slate-900 dark:text-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">eGFR Calculation</span>
                <div className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {egfrResult.egfr} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mL/min/1.73m²</span>
                </div>
                <div className={`mt-2 text-sm font-bold ${egfrResult.color}`}>
                  {egfrResult.stage}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{egfrResult.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                💡 Adjust renally eliminated antibiotic and diuretic dosages if eGFR &lt; 60.
              </div>
            </div>
          </>
        )}

        {/* 3. IV DRIP RATE CALCULATOR */}
        {activeCalc === 'drip' && (
          <>
            <div className="md:col-span-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-blue-500 dark:text-blue-400" /> IV Flow & Drip Rate Estimator (gtt/min)
                </h3>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold border border-blue-100 dark:border-blue-900/50">
                  Gravity & Volumetric Pump
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Volume */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Total Volume (mL)</label>
                  <input
                    type="number"
                    step="50"
                    min="10"
                    max="5000"
                    value={volume}
                    onChange={e => setVolume(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {/* Quick Volume Presets */}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    {[100, 250, 500, 1000].map(v => (
                      <button
                        key={v}
                        onClick={() => {
                          setVolume(v);
                          showToast(`Set volume to ${v} mL`, "💉", "info");
                        }}
                        className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                          volume === v 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {v} mL
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration / Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Infusion Duration</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={timeVal}
                      onChange={e => setTimeVal(Math.max(1, Number(e.target.value)))}
                      className="w-2/3 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={timeUnit}
                      onChange={e => setTimeUnit(e.target.value as any)}
                      className="w-1/3 px-1.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="hours">hrs</option>
                      <option value="mins">mins</option>
                    </select>
                  </div>
                  {/* Quick Duration Presets */}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    {[
                      { label: '30m', val: 30, unit: 'mins' },
                      { label: '1h', val: 1, unit: 'hours' },
                      { label: '4h', val: 4, unit: 'hours' },
                      { label: '8h', val: 8, unit: 'hours' },
                      { label: '24h', val: 24, unit: 'hours' }
                    ].map(t => (
                      <button
                        key={t.label}
                        onClick={() => {
                          setTimeVal(t.val);
                          setTimeUnit(t.unit as any);
                          showToast(`Set infusion duration to ${t.label}`, "⏱️", "info");
                        }}
                        className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                          timeVal === t.val && timeUnit === t.unit
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drop Factor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Drop Factor (gtt/mL)</label>
                  <select
                    value={dropFactor}
                    onChange={e => setDropFactor(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10 gtt/mL (Macrodrip - Blood / viscous)</option>
                    <option value={15}>15 gtt/mL (Macrodrip - Standard Adult)</option>
                    <option value={20}>20 gtt/mL (Macrodrip - Solution Tubing)</option>
                    <option value={60}>60 gtt/mL (Microdrip - Pediatric / ICU)</option>
                  </select>
                  {/* Quick Drop Factor Buttons */}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    {[10, 15, 20, 60].map(f => (
                      <button
                        key={f}
                        onClick={() => setDropFactor(f)}
                        className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                          dropFactor === f 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {f} {f === 60 ? 'micro' : 'macro'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Formula Breakdown Box */}
              <div className="p-3 bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200/80 dark:border-slate-700 rounded-lg text-xs space-y-1 text-slate-700 dark:text-slate-200">
                <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Formula & Calculation Step:
                </div>
                <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 pl-4">
                  Drip Rate = (Volume [mL] × Drop Factor [gtt/mL]) ÷ Time [mins]
                </div>
                <div className="font-mono text-[11px] text-blue-800 dark:text-blue-200 pl-4">
                  (${volume} mL × ${dropFactor} gtt/mL) ÷ {timeUnit === 'hours' ? `${timeVal} h (${timeVal * 60} mins)` : `${timeVal} mins`} = <span className="font-bold underline">{dripResult.gttMin} gtt/min</span>
                </div>
              </div>
            </div>

            {/* Drip Rate Result Box */}
            <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-md flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Calculated Infusion Rates</span>
                
                <div className="mt-3">
                  <div className="text-3xl font-black">{dripResult.gttMin} <span className="text-sm font-medium text-blue-200">gtt / min</span></div>
                  <div className="text-xs text-blue-100 font-medium mt-0.5">Gravity Drip Speed</div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/20 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-lg font-bold">{dripResult.secPerDrop > 0 ? `${dripResult.secPerDrop}s` : 'N/A'}</div>
                    <div className="text-[10px] text-blue-200 font-medium">Sec / Drop</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{dripResult.mlHr} <span className="text-xs font-normal">mL/h</span></div>
                    <div className="text-[10px] text-blue-200 font-medium">Pump Volumetric Rate</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 text-[11px] text-blue-100 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span>Count drops for 15 seconds and multiply by 4 to confirm gravity rate.</span>
              </div>
            </div>
          </>
        )}

        {/* 4. MAP CALCULATOR */}
        {activeCalc === 'map' && (
          <>
            <div className="md:col-span-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Mean Arterial Pressure (MAP)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Systolic Blood Pressure (mmHg)</label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    value={sbp}
                    onChange={e => setSbp(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Diastolic Blood Pressure (mmHg)</label>
                  <input
                    type="number"
                    min="30"
                    max="160"
                    value={dbp}
                    onChange={e => setDbp(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-800 dark:text-slate-100">Formula:</span> MAP = DBP + ⅓ (SBP – DBP). MAP &ge; 65 mmHg is necessary to maintain vital end-organ perfusion in critical care.
              </div>
            </div>

            {/* MAP Result Box */}
            <div className="p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-rose-200/80 dark:border-rose-900/50 rounded-xl shadow-sm flex flex-col justify-between text-slate-900 dark:text-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Calculated MAP</span>
                <div className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{mapResult.map} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mmHg</span></div>
                <div className={`mt-2 text-xs font-bold ${mapResult.color}`}>
                  {mapResult.status}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                ⚠️ MAP &lt; 65 mmHg risks acute kidney injury and organ ischemia.
              </div>
            </div>
          </>
        )}

        {/* 5. DOSAGE BY WEIGHT CALCULATOR */}
        {activeCalc === 'dosage' && (
          <>
            <div className="md:col-span-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Weight-Based Medication Dosage
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Patient Weight (kg)</label>
                  <input
                    type="number"
                    min="1"
                    max="250"
                    value={ptWeight}
                    onChange={e => setPtWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Dose (mg / kg / day)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={doseMgKg}
                    onChange={e => setDoseMgKg(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Frequency per Day</label>
                  <select
                    value={dosesPerDay}
                    onChange={e => setDosesPerDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={1}>Once daily (QD)</option>
                    <option value={2}>Twice daily (BID)</option>
                    <option value={3}>Three times daily (TID)</option>
                    <option value={4}>Four times daily (QID)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dosage Result Box */}
            <div className="p-5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-purple-200/80 dark:border-purple-900/50 rounded-xl shadow-sm flex flex-col justify-between text-slate-900 dark:text-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Calculated Dose</span>
                <div className="mt-3">
                  <div className="text-2xl font-black text-purple-700 dark:text-purple-300">{dosageResult.perDose} <span className="text-xs font-normal text-slate-600 dark:text-slate-300">mg / dose</span></div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Individual Dose</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{dosageResult.totalDaily} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mg / day</span></div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Daily Dose</div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </motion.div>
  );
}
