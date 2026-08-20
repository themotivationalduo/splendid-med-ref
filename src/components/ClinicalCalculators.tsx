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
  X
} from 'lucide-react';

export function ClinicalCalculators() {
  const [activeCalc, setActiveCalc] = useState<'bmi' | 'egfr' | 'drip' | 'map' | 'dosage'>('bmi');
  const [calcSearch, setCalcSearch] = useState<string>('');

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
            Rapid point-of-care tools for anthropometry, renal function, infusion rate, and pharmacology.
          </p>
        </div>

        {/* Drop-Down Tool Selector & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Drop-down Tool Select */}
          <div className="relative w-full sm:w-56">
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
