export interface MedicalEntity {
  id: string;
  title: string;
  category: 'disease' | 'drug' | 'anatomy' | 'procedure' | 'diagnostic' | 'terminology';
  summary: string;
  details: {
    overview?: string;
    symptoms?: string[];
    causes?: string[];
    etiology?: string;
    diagnostics?: string[];
    treatment?: string[];
    dosage?: string;
    administration?: string;
    sideEffects?: string[];
    contraindications?: string[];
    prognosis?: string;
    complications?: string[];
  };
  icdCode?: string;
  rxcui?: string;
}

export const MEDICAL_DATABASE: MedicalEntity[] = [
  // A
  {
    id: 'abdominal_aortic_aneurysm',
    title: 'Abdominal Aortic Aneurysm (AAA)',
    category: 'disease',
    icdCode: 'BD50',
    summary: 'Localized enlargement of the abdominal aorta; high risk of fatal rupture if untreated.',
    details: {
      overview: 'Abdominal aortic aneurysm involves a weakened and bulging section in the wall of the abdominal aorta, typically occurring below the renal arteries.',
      symptoms: ['Pulsating sensation in abdomen', 'Deep, constant pain in lower back or side', 'Abdominal pain'],
      causes: ['Atherosclerosis', 'Smoking', 'Advanced age', 'Family history', 'Hypertension'],
      etiology: 'Degradation of extracellular matrix proteins (elastin and collagen) in the aortic media combined with chronic inflammation.',
      diagnostics: ['Abdominal ultrasound', 'CT angiography of abdomen and pelvis'],
      treatment: ['Surveillance for small aneurysms', 'Open surgical repair or endovascular aneurysm repair (EVAR) for large or symptomatic aneurysms'],
      complications: ['Aortic rupture with massive hemorrhage', 'Thromboembolism']
    }
  },
  {
    id: 'abscess',
    title: 'Abscess',
    category: 'disease',
    icdCode: '1B70',
    summary: 'Localized collection of pus within tissue, usually caused by bacterial infection (e.g., Staphylococcus aureus).',
    details: {
      overview: 'A painful, swollen, pus-filled lump under the skin or within internal organs resulting from host inflammatory response to bacterial invasion.',
      symptoms: ['Pain and tenderness', 'Localized swelling and erythema', 'Warmth', 'Fever and chills'],
      causes: ['Bacterial infection (Staphylococcus aureus, MRSA, streptococci)', 'Blocked oil or sweat glands', 'Foreign bodies'],
      etiology: 'Neutrophil accumulation and liquefactive necrosis forming a purulent cavity walled off by granulation tissue.',
      diagnostics: ['Clinical examination', 'Ultrasound imaging', 'Culture and Gram stain of aspirated pus'],
      treatment: ['Incision and drainage (I&D)', 'Warm compresses', 'Empiric antibiotic therapy when cellulitis is present'],
      complications: ['Sepsis', 'Fistula formation', 'Spread of infection to deeper tissues']
    }
  },
  {
    id: 'acid_base_balance',
    title: 'Acid-Base Balance',
    category: 'diagnostic',
    summary: 'Regulation of body fluid pH through arterial blood gases (ABGs), measuring pH, PaCO2, and HCO3-.',
    details: {
      overview: 'Physiological mechanisms maintaining arterial blood pH between 7.35 and 7.45 via pulmonary ventilation and renal bicarbonate handling.',
      symptoms: ['Kussmaul breathing in acidosis', 'Hypoventilation in alkalosis', 'Confusion', 'Tremors'],
      etiology: 'Respiratory disorders (alterations in PaCO2) and metabolic disorders (alterations in HCO3-).',
      diagnostics: ['Arterial Blood Gas (ABG) analysis', 'Serum electrolytes and anion gap calculation'],
      treatment: ['Treat underlying etiology', 'Mechanical ventilation', 'Sodium bicarbonate or acidifying agents when indicated'],
      complications: ['Arrhythmias', 'Hemodynamic instability', 'Encephalopathy']
    }
  },
  {
    id: 'acute_coronary_syndrome',
    title: 'Acute Coronary Syndrome (ACS)',
    category: 'disease',
    icdCode: 'BA41',
    summary: 'Range of conditions associated with sudden, reduced blood flow to the heart (e.g., NSTEMI, STEMI, unstable angina).',
    details: {
      overview: 'Life-threatening cardiac emergencies resulting from acute coronary plaque disruption and thrombotic occlusion.',
      symptoms: ['Substernal chest pain or pressure', 'Radiation to jaw, neck, or left arm', 'Diaphoresis', 'Dyspnea', 'Nausea'],
      causes: ['Atherosclerotic plaque rupture', 'Coronary thrombosis', 'Coronary artery vasospasm'],
      etiology: 'Ischemia-induced myocardial cell injury progressing rapidly to necrosis if unrevised.',
      diagnostics: ['12-lead ECG', 'Serial cardiac troponins', 'Coronary angiography'],
      treatment: ['Emergency PCI or thrombolysis', 'Dual antiplatelet therapy', 'Anticoagulation', 'Beta-blockers and statins'],
      complications: ['Cardiogenic shock', 'Heart failure', 'Ventricular fibrillation', 'Myocardial rupture']
    }
  },
  {
    id: 'adverse_drug_reactions',
    title: 'Adverse Drug Reactions (ADRs)',
    category: 'terminology',
    summary: 'Harmful, unintended responses to medications categorized into Type A (predictable/dose-dependent) and Type B (idiosyncratic/allergic).',
    details: {
      overview: 'Clinical classification of medication toxicity and side effects guiding drug safety monitoring and deprescribing.',
      symptoms: ['Hypersensitivity rash', 'Organ toxicity', 'Gastrointestinal distress', 'Central nervous system depression'],
      causes: ['Pharmacological exaggeration (Type A)', 'Immunological hypersensitivity or genetic polymorphism (Type B)'],
      diagnostics: ['Medication reconciliation', 'Serum drug monitoring', 'Naranjo ADR probability scale'],
      treatment: ['Discontinuation of offending agent', 'Supportive care', 'Antidote administration (e.g., naloxone, flumazenil)']
    }
  },
  {
    id: 'anaphylaxis',
    title: 'Anaphylaxis',
    category: 'disease',
    icdCode: '4E00',
    summary: 'Severe, life-threatening systemic allergic reaction managed immediately with intramuscular epinephrine (0.3 mg 1:1000).',
    details: {
      overview: 'Rapid-onset multisystem allergic reaction characterized by mast cell and basophil mediator release.',
      symptoms: ['Urticaria and angioedema', 'Bronchospasam and wheezing', 'Hypotension and tachycardia', 'Throat swelling and stridor'],
      causes: ['Food allergens (peanuts, shellfish)', 'Insect stings (bee, wasp)', 'Medications (penicillin, radiocontrast dyes)', 'Latex'],
      etiology: 'IgE-mediated hypersensitivity triggering massive systemic histamine and leukotriene release.',
      diagnostics: ['Clinical presentation (sudden onset with multi-organ involvement)', 'Serum tryptase levels'],
      treatment: ['Immediate IM Epinephrine (0.3mg in anterolateral thigh)', 'IV fluids', 'H1 and H2 antihistamines', 'Systemic corticosteroids', 'Albuterol nebulization'],
      complications: ['Respiratory arrest', 'Cardiovascular collapse', 'Anoxic brain injury']
    }
  },
  {
    id: 'anatomy_systemic',
    title: 'Anatomy (Systemic & Regional)',
    category: 'anatomy',
    summary: 'Comprehensive breakdown of human structures, including musculoskeletal, cardiovascular, nervous, and endocrine systems.',
    details: {
      overview: 'Fundamental study of structural organization of the human body across cellular, tissue, organ, and system levels.',
      diagnostics: ['Gross anatomical examination', 'CT and MRI scans', 'Surface anatomy palpation'],
      treatment: ['Surgical planning and anatomical navigation']
    }
  },
  {
    id: 'apgar_score',
    title: 'Apgar Score',
    category: 'diagnostic',
    summary: 'Rapid assessment tool evaluated at 1 and 5 minutes post-birth (Appearance, Pulse, Grimace, Activity, Respiration).',
    details: {
      overview: 'Standardized scoring system from 0 to 10 evaluating newborn transition and physiological well-being immediately after delivery.',
      diagnostics: [
        'Appearance (Skin color)',
        'Pulse (Heart rate >= 100 bpm)',
        'Grimace (Reflex irritability)',
        'Activity (Muscle tone)',
        'Respiration (Respiratory effort)'
      ],
      treatment: ['Guides neonatal resuscitation protocols when scores are low (< 7 at 5 minutes)']
    }
  },
  {
    id: 'aphasia_types',
    title: 'Aphasia Types',
    category: 'disease',
    icdCode: '8A40',
    summary: 'Neurological speech impairments, including Broca’s (expressive/non-fluent) and Wernicke’s (receptive/fluent) aphasia.',
    details: {
      overview: 'Language disorders resulting from brain damage to speech centers in the dominant cerebral hemisphere.',
      symptoms: ['Expressive non-fluent speech with preserved comprehension (Broca)', 'Fluent speech devoid of meaning with impaired comprehension (Wernicke)', 'Paraphasias'],
      causes: ['Cerebrovascular accident (stroke)', 'Traumatic brain injury', 'Brain tumor', 'Neurodegenerative disease'],
      etiology: 'Ischemic or structural lesion in the inferior frontal gyrus (Broca) or superior temporal gyrus (Wernicke).',
      diagnostics: ['Neurological examination', 'Boston Diagnostic Aphasia Examination', 'MRI brain'],
      treatment: ['Speech and language pathology rehabilitation']
    }
  },
  {
    id: 'autoimmune_disorders',
    title: 'Autoimmune Disorders',
    category: 'disease',
    icdCode: '4A80',
    summary: 'Pathological state where immune responses target self-antigens (e.g., Systemic Lupus Erythematosus, Rheumatoid Arthritis).',
    details: {
      overview: 'Chronic inflammatory conditions caused by loss of immunological self-tolerance and autoreactive lymphocyte activation.',
      symptoms: ['Chronic fatigue', 'Joint pain and swelling', 'Fever', 'Organ-specific dysfunction'],
      causes: ['Genetic predisposition (HLA markers)', 'Environmental triggers (viral infections, UV light)', 'Hormonal factors'],
      etiology: 'Molecular mimicry, neoantigen formation, and defective regulatory T-cell suppression.',
      diagnostics: ['Autoantibody panels (ANA, RF, anti-CCP, dsDNA)', 'Inflammatory markers (ESR, CRP)'],
      treatment: ['Immunosuppressive agents', 'Corticosteroids', 'Biologic therapies (TNF inhibitors)', 'Disease-modifying antirheumatic drugs (DMARDs)'],
      complications: ['Organ failure', 'Accelerated atherosclerosis', 'Increased malignancy risk']
    }
  },

  // B
  {
    id: 'bacterial_pathogens',
    title: 'Bacterial Pathogens',
    category: 'terminology',
    summary: 'Clinical classification of bacteria by Gram stain, morphology, and oxygen tolerance (e.g., Gram-positive cocci, Gram-negative bacilli).',
    details: {
      overview: 'Microbiological grouping guiding empiric antimicrobial selection in infectious disease management.',
      diagnostics: ['Gram staining', 'Culture on agar plates', 'MALDI-TOF mass spectrometry', 'PCR amplification']
    }
  },
  {
    id: 'bls_acls',
    title: 'Basic Life Support (BLS) & ACLS',
    category: 'procedure',
    summary: 'Algorithms for cardiac arrest, chest compressions, airway management, and advanced electrical/pharmacological interventions.',
    details: {
      overview: 'Standardized resuscitation protocols for restoring spontaneous circulation during cardiac arrest.',
      treatment: ['High-quality chest compressions (100-120/min)', 'Defibrillation for VF/pVT', 'Epinephrine 1mg IV every 3-5 minutes', 'Advanced airway placement']
    }
  },
  {
    id: 'bph',
    title: 'Benign Prostatic Hyperplasia (BPH)',
    category: 'disease',
    icdCode: 'GB50',
    summary: 'Non-cancerous enlargement of the prostate gland causing lower urinary tract symptoms (LUTS).',
    details: {
      overview: 'Age-related stromal and epithelial cell proliferation in the transition zone of the prostate obstructing urinary flow.',
      symptoms: ['Urinary frequency and urgency', 'Weak urinary stream', 'Nocturia', 'Post-void dribbling'],
      causes: ['Dihydrotestosterone (DHT) stimulation', 'Aging and hormonal shifts'],
      diagnostics: ['Digital rectal examination (DRE)', 'Serum PSA test', 'Uroflowmetry', 'Post-void residual volume'],
      treatment: ['Alpha-1 blockers (Tamsulosin)', '5-alpha-reductase inhibitors (Finasteride)', 'Transurethral resection of the prostate (TURP)'],
      complications: ['Acute urinary retention', 'Bladder stones', 'Hydronephrosis and renal failure']
    }
  },
  {
    id: 'bipolar_disorder',
    title: 'Bipolar Disorder',
    category: 'disease',
    icdCode: '6A60',
    summary: 'Psychiatric condition characterized by alternating episodes of mania/hypomania and major depression.',
    details: {
      overview: 'Chronic mood disorder involving severe shifts in energy, mood, and activity levels.',
      symptoms: ['Mania: Elevated mood, grandiosity, decreased need for sleep, pressured speech, racing thoughts', 'Depression: Sadness, fatigue, hopelessness'],
      causes: ['Strong genetic heritability', 'Neurotransmitter dysregulation (dopamine, serotonin, norepinephrine)', 'Environmental stressors'],
      diagnostics: ['DSM-5 psychiatric evaluation', 'Mood charts', 'Thyroid function tests to rule out mimics'],
      treatment: ['Mood stabilizers (Lithium, Valproate)', 'Atypical antipsychotics', 'Psychotherapy'],
      complications: ['Substance abuse', 'Suicidal ideation', 'Social and occupational impairment']
    }
  },
  {
    id: 'blood_components',
    title: 'Blood Components & Transfusions',
    category: 'procedure',
    summary: 'Indications, administration guidelines, and crossmatching for Packed Red Blood Cells (PRBCs), Platelets, Fresh Frozen Plasma (FFP), and Cryoprecipitate.',
    details: {
      overview: 'Hemotherapy protocols ensuring safe restoration of oxygen-carrying capacity, volume, and hemostatic factors.',
      treatment: ['PRBC transfusion for severe anemia (Hb < 7 g/dL)', 'Platelet transfusion for thrombocytopenia / bleeding', 'FFP for coagulopathy and INR correction']
    }
  },
  {
    id: 'bmi_nutrition',
    title: 'Body Mass Index (BMI) & Nutritional Metrics',
    category: 'diagnostic',
    summary: 'Nutritional classification ranges (kg/m^2) alongside clinical malnutrition screening parameters.',
    details: {
      overview: 'Anthropometric index calculated as weight in kilograms divided by height in meters squared.',
      diagnostics: [
        'Underweight: < 18.5 kg/m2',
        'Normal: 18.5 - 24.9 kg/m2',
        'Overweight: 25.0 - 29.9 kg/m2',
        'Obese: >= 30.0 kg/m2'
      ],
      treatment: ['Dietary counseling, lifestyle modification, bariatric surgery evaluation']
    }
  },
  {
    id: 'bradycardia_protocols',
    title: 'Bradycardia Protocols',
    category: 'procedure',
    summary: 'Diagnostic criteria and treatment for slow heart rates (HR < 60 bpm), including Atropine dosing and transcutaneous pacing.',
    details: {
      overview: 'ACLS management algorithm for symptomatic bradycardia causing hypotension, altered mental status, or shock.',
      treatment: ['Atropine 1 mg IV bolus (repeat up to 3 mg)', 'Transcutaneous pacing', 'Epinephrine infusion (2-10 mcg/min) or Dopamine infusion']
    }
  },
  {
    id: 'bronchial_asthma_expanded',
    title: 'Bronchial Asthma (Expanded Guide)',
    category: 'disease',
    icdCode: 'CA20',
    summary: 'Chronic inflammatory airway disease marked by hyperresponsiveness, reversible airflow obstruction, and bronchospasm.',
    details: {
      overview: 'Detailed clinical management guidelines encompassing stepwise controller therapy and acute exacerbation protocols.',
      treatment: ['Stepwise ICS-formoterol therapy', 'Systemic corticosteroids for acute exacerbations', 'Oxygen supplementation']
    }
  },
  {
    id: 'burns_rule_of_nines',
    title: 'Burns (Rule of Nines)',
    category: 'diagnostic',
    summary: 'Assessment tool for Total Body Surface Area (TBSA) burned to calculate Parkland fluid resuscitation requirements.',
    details: {
      overview: 'Anatomical estimation tool dividing body surface into percentages of 9 (head 9%, arms 9% each, anterior trunk 18%, posterior trunk 18%, legs 18% each, perineum 1%).',
      treatment: ['Parkland formula: 4 mL x weight (kg) x % TBSA burned of crystalloid over 24 hours (half in first 8 hours)']
    }
  },

  // C
  {
    id: 'cva_stroke',
    title: 'Cerebrovascular Accident (CVA/Stroke)',
    category: 'disease',
    icdCode: '8B00',
    summary: 'Ischemic or hemorrhagic disruption of cerebral blood flow; diagnostic protocols involve emergent Non-Contrast CT scanning.',
    details: {
      overview: 'Acute neurological emergency requiring rapid triage to distinguish ischemic stroke from intracerebral hemorrhage.',
      symptoms: ['Unilateral weakness or numbness', 'Facial droop', 'Slurred speech (dysarthria)', 'Aphasia', 'Visual field cuts'],
      diagnostics: ['Non-contrast head CT', 'CT angiography / perfusion', 'MRI brain'],
      treatment: ['IV alteplase or tenecteplase within therapeutic window', 'Mechanical thrombectomy', 'Blood pressure and glycemic control']
    }
  },
  {
    id: 'copd_expanded',
    title: 'Chronic Obstructive Pulmonary Disease (COPD)',
    category: 'disease',
    icdCode: 'CA22',
    summary: 'Progressive lung conditions (Emphysema, Chronic Bronchitis) defined by persistent airflow limitation.',
    details: {
      overview: 'Comprehensive classification using GOLD criteria based on spirometry, exacerbation history, and symptom scores.',
      treatment: ['LAMA/LABA dual bronchodilator therapy', 'Inhaled corticosteroids', 'Pulmonary rehabilitation', 'Oxygen therapy']
    }
  },
  {
    id: 'clinical_chemistry_ranges',
    title: 'Clinical Chemistry Normal Ranges',
    category: 'diagnostic',
    summary: 'Reference values for serum electrolytes (Na+, K+, Cl-), BUN, creatinine, glucose, and liver function tests (LFTs).',
    details: {
      overview: 'Standard laboratory reference intervals for metabolic panels and chemistry assays.',
      diagnostics: [
        'Sodium: 135-145 mEq/L',
        'Potassium: 3.5-5.0 mEq/L',
        'BUN: 7-20 mg/dL',
        'Creatinine: 0.6-1.2 mg/dL',
        'Fasting Glucose: 70-99 mg/dL'
      ]
    }
  },
  {
    id: 'congestive_heart_failure',
    title: 'Congestive Heart Failure (CHF)',
    category: 'disease',
    icdCode: 'BD10',
    summary: 'Inability of the heart to pump efficiently; categorized into HFrEF (reduced ejection fraction) and HFpEF (preserved ejection fraction).',
    details: {
      overview: 'Syndrome of cardiac dysfunction leading to fluid retention, dyspnea, and reduced exercise tolerance.',
      treatment: ['Guideline-Directed Medical Therapy (GDMT): ARNI/ACEi, Beta-blockers, MRA, SGLT2i', 'Loop diuretics']
    }
  },
  {
    id: 'cranial_nerves',
    title: 'Cranial Nerves (I–XII)',
    category: 'anatomy',
    summary: 'Assessment methods, anatomical pathways, and deficit patterns for all twelve cranial nerves.',
    details: {
      overview: 'Systematic examination of olfactory, optic, oculomotor, trochlear, trigeminal, abducens, facial, vestibulocochlear, glossopharyngeal, vagus, accessory, and hypoglossal nerves.',
      diagnostics: ['Bedside cranial nerve testing maneuvers']
    }
  },
  {
    id: 'corticosteroids',
    title: 'Corticosteroids',
    category: 'drug',
    rxcui: '8640',
    summary: 'Dosing, indications, and withdrawal tapers for anti-inflammatory agents (e.g., Prednisone, Dexamethasone, Hydrocortisone).',
    details: {
      overview: 'Potent anti-inflammatory and immunosuppressive medications mimicking cortisol.',
      sideEffects: ['Hyperglycemia', 'Weight gain', 'Osteoporosis', 'Immunosuppression', 'Adrenal suppression with abrupt cessation'],
      treatment: ['Inflammatory conditions, autoimmune flare-ups, adrenal insufficiency']
    }
  },

  // D
  {
    id: 'dermatological_lesions',
    title: 'Dermatological Lesions',
    category: 'terminology',
    summary: 'Classification of skin findings into primary (macules, papules, plaques, vesicles) and secondary (scales, crusts, erosions) lesions.',
    details: {
      overview: 'Standardized terminology for physical examination of dermatological conditions and rashes.',
      diagnostics: ['Skin scrapings', 'Wood lamp examination', 'Skin biopsy']
    }
  },
  {
    id: 'diabetes_mellitus',
    title: 'Diabetes Mellitus (Types 1 & 2)',
    category: 'disease',
    icdCode: '5A10',
    summary: 'Diagnostic thresholds (HbA1c >= 6.5%, Fasting Plasma Glucose >= 126 mg/dL) and management with insulin or oral hypoglycemics.',
    details: {
      overview: 'Endocrine disorders of carbohydrate metabolism resulting in chronic hyperglycemia and microvascular/macrovascular risks.',
      treatment: ['Metformin', 'Insulin therapy', 'GLP-1 receptor agonists', 'SGLT2 inhibitors']
    }
  },
  {
    id: 'diabetic_ketoacidosis',
    title: 'Diabetic Ketoacidosis (DKA)',
    category: 'disease',
    icdCode: '5A14',
    summary: 'Metabolic crisis characterized by hyperglycemia, ketonemia, and high anion gap metabolic acidosis.',
    details: {
      overview: 'Acute life-threatening complication of type 1 (and severe type 2) diabetes caused by absolute or relative insulin deficiency.',
      symptoms: ['Nausea and vomiting', 'Abdominal pain', 'Fruity breath odor', 'Kussmaul respirations', 'Dehydration'],
      diagnostics: ['Blood glucose > 250 mg/dL', 'Arterial pH < 7.30', 'Serum bicarbonate < 18 mEq/L', 'Positive serum ketones', 'High anion gap'],
      treatment: ['Aggressive IV fluid resuscitation (Normal Saline)', 'Regular insulin infusion', 'Potassium repletion', 'Sodium bicarbonate if severe acidosis (pH < 6.9)']
    }
  },
  {
    id: 'diagnostic_imaging',
    title: 'Diagnostic Imaging Modalities',
    category: 'diagnostic',
    summary: 'Indications, radiation risks, and contrast contraindications for X-ray, Ultrasound, Computed Tomography (CT), and Magnetic Resonance Imaging (MRI).',
    details: {
      overview: 'Radiological overview guiding selection of appropriate diagnostic imaging based on clinical presentation and ionizing radiation exposure constraints.',
      diagnostics: ['Plain radiography', 'Ultrasonography', 'CT scan with/without contrast', 'MRI']
    }
  },
  {
    id: 'drug_interactions',
    title: 'Drug Interactions & Contraindications',
    category: 'terminology',
    summary: 'Mechanisms of cytochrome P450 (CYP450) enzyme induction/inhibition affecting serum drug levels.',
    details: {
      overview: 'Pharmacokinetic and pharmacodynamic drug-drug interactions resulting in toxicity or therapeutic failure.',
      treatment: ['Dose adjustment', 'Medication substitution', 'Therapeutic drug monitoring']
    }
  },
  {
    id: 'dyslipidemia',
    title: 'Dyslipidemia',
    category: 'disease',
    icdCode: '5C80',
    summary: 'Lipid panel target ranges and cardiovascular risk-reduction strategies using statin therapy.',
    details: {
      overview: 'Elevated total cholesterol, LDL-C, triglycerides, or low HDL-C predisposing to atherosclerosis.',
      treatment: ['Lifestyle modification', 'HMG-CoA reductase inhibitors (statins)', 'Ezetimibe', 'PCSK9 inhibitors']
    }
  },

  // E
  {
    id: 'ecg_interpretation',
    title: 'Electrocardiography (ECG/EKG) Interpretation',
    category: 'diagnostic',
    summary: 'Systematic analysis of rate, rhythm, axis, wave morphology (P, QRS, T), and interval lengths (PR, QTc).',
    details: {
      overview: 'Standardized 12-lead ECG analysis for diagnosing arrhythmias, ischemic heart disease, and chamber enlargement.',
      diagnostics: ['Rate and rhythm determination', 'ST-segment elevation/depression analysis', 'Q-wave assessment']
    }
  },
  {
    id: 'electrolyte_imbalances',
    title: 'Electrolyte Imbalances',
    category: 'disease',
    icdCode: '5C70',
    summary: 'Clinical features and corrective protocols for Hyperkalemia, Hypokalemia, Hyponatremia, Hypernatremia, Hypercalcemia, and Hypocalcemia.',
    details: {
      overview: 'Disorders of serum electrolytes causing neuromuscular and cardiac electrophysiological disturbances.',
      treatment: ['IV electrolyte replacement', 'Insulin/glucose for hyperkalemia', 'Fluid management for sodium disorders']
    }
  },
  {
    id: 'endocarditis',
    title: 'Endocarditis (Infective)',
    category: 'disease',
    icdCode: 'BC40',
    summary: 'Infection of the endocardium evaluated using the Modified Duke Criteria (major and minor criteria).',
    details: {
      overview: 'Microbial infection of heart valves leading to vegetation formation, valve destruction, and septic embolization.',
      symptoms: ['Fever and heart murmur', 'Petechiae, splinter hemorrhages, Osler nodes, Janeway lesions'],
      diagnostics: ['Blood cultures (positive for staph/strep)', 'Echocardiogram (TTE/TEE showing vegetations)', 'Modified Duke Criteria'],
      treatment: ['Prolonged intravenous antibiotic therapy (4-6 weeks)', 'Surgical valve replacement if indicated']
    }
  },
  {
    id: 'epidemiology_biostatistics',
    title: 'Epidemiology & Biostatistics',
    category: 'terminology',
    summary: 'Measures of disease frequency (incidence, prevalence) and clinical trial metrics (Relative Risk, Odds Ratio, Number Needed to Treat).',
    details: {
      overview: 'Methodological foundation for evaluating scientific literature, clinical trial design, and public health data.'
    }
  },
  {
    id: 'epilepsy_seizures',
    title: 'Epilepsy & Seizure Classifications',
    category: 'disease',
    icdCode: '8A60',
    summary: 'Diagnostic criteria for focal vs. generalized seizures and step-by-step management of Status Epilepticus.',
    details: {
      overview: 'Neurological condition characterized by recurrent unprovoked seizures resulting from abnormal electrical discharges in the brain.',
      treatment: ['Benzodiazepines (Lorazepam) for acute seizures', 'Antiepileptic drugs (Levetiracetam, Valproate, Lamotrigine) for maintenance']
    }
  },

  // F
  {
    id: 'fluid_resuscitation',
    title: 'Fluid & Electrolyte Resuscitation',
    category: 'procedure',
    summary: 'Calculations for maintenance and deficit fluids (e.g., 4-2-1 rule, Normal Saline vs. Lactated Ringer\'s).',
    details: {
      overview: 'Intravenous fluid management protocols for surgical, trauma, and dehydrated patients.',
      treatment: ['4-2-1 rule for hourly maintenance', 'Balanced crystalloids (Lactated Ringer\'s)']
    }
  },
  {
    id: 'fracture_classification',
    title: 'Fracture Classification Systems',
    category: 'terminology',
    summary: 'Orthopedic categorization of bone disruptions (e.g., Open/Closed, Comminuted, Greenstick, Salter-Harris growth plate injuries).',
    details: {
      overview: 'Orthopedic systems guiding surgical fixation, casting, and healing prognosis.',
      diagnostics: ['Plain radiographs', 'CT scans for intra-articular fractures']
    }
  },
  {
    id: 'fungal_infections',
    title: 'Fungal Infections (Mycoses)',
    category: 'disease',
    icdCode: '1F20',
    summary: 'Clinical presentation and treatment for superficial, subcutaneous, and systemic fungal pathogens (e.g., Candida, Aspergillus, Cryptococcus).',
    details: {
      overview: 'Fungal infections ranging from superficial dermatophytosis to invasive systemic mycoses in immunocompromised hosts.',
      treatment: ['Antifungal agents (Fluconazole, Amphotericin B, Voriconazole)']
    }
  },

  // G
  {
    id: 'gi_hemorrhage',
    title: 'Gastrointestinal Hemorrhage',
    category: 'disease',
    icdCode: 'DA20',
    summary: 'Upper vs. lower GI bleeding causes, diagnostic endoscopy criteria, and acute stabilization.',
    details: {
      overview: 'Acute bleeding from the gastrointestinal tract manifesting as hematemesis, melena, or hematochezia.',
      treatment: ['Vascular access and fluid resuscitation', 'PPI infusion', 'Urgent upper endoscopy / colonoscopy']
    }
  },
  {
    id: 'glasgow_coma_scale',
    title: 'Glasgow Coma Scale (GCS)',
    category: 'diagnostic',
    summary: 'Neurological scoring system evaluating Eye (1–4), Verbal (1–5), and Motor (1–6) responses (total score 3–15).',
    details: {
      overview: 'Standardized clinical scale assessing level of consciousness in trauma and critical care.',
      diagnostics: ['Eye opening (1-4)', 'Verbal response (1-5)', 'Motor response (1-6)']
    }
  },
  {
    id: 'glomerular_diseases',
    title: 'Glomerular Diseases',
    category: 'disease',
    icdCode: 'GB00',
    summary: 'Differentiating Nephrotic Syndrome (proteinuria > 3.5 g/day, edema, hyperlipidemia) from Nephritic Syndrome (hematuria, hypertension, oliguria).',
    details: {
      overview: 'Renal pathology affecting glomeruli, leading to distinct nephrotic or nephritic clinical syndromes.',
      diagnostics: ['Urinalysis', '24-hour urine protein', 'Kidney biopsy']
    }
  },
  {
    id: 'gout_pseudogout',
    title: 'Gout & Pseudogout',
    category: 'disease',
    icdCode: 'FA25',
    summary: 'Crystal arthropathies distinguished by joint fluid aspiration (monosodium urate needle-like negative birefringent vs. calcium pyrophosphate rhomboid positive birefringent).',
    details: {
      overview: 'Inflammatory arthritis caused by crystal deposition within synovial fluid.',
      treatment: ['NSAIDs, Colchicine, Allopurinol for gout', 'NSAIDs, intra-articular steroids for pseudogout']
    }
  },

  // H
  {
    id: 'hematological_malignancies',
    title: 'Hematological Malignancies',
    category: 'disease',
    icdCode: '2A60',
    summary: 'Diagnostic profiles for Leukemias (AML, ALL, CML, CLL) and Lymphomas (Hodgkin vs. Non-Hodgkin).',
    details: {
      overview: 'Cancers affecting blood, bone marrow, and lymphatic systems.',
      diagnostics: ['Bone marrow biopsy', 'Flow cytometry', 'Cytogenetic analysis']
    }
  },
  {
    id: 'hepatitis_viridiae',
    title: 'Hepatitis Viridiae (A, B, C, D, E)',
    category: 'disease',
    icdCode: '1E50',
    summary: 'Transmission routes, serological markers (e.g., HBsAg, Anti-HBs, Anti-HBc), chronic disease risk, and antiviral management.',
    details: {
      overview: 'Viral hepatic infections causing acute or chronic inflammation of the liver.',
      treatment: ['Direct-acting antivirals for HCV', 'Nucleos(t)ide analogs for HBV', 'Supportive care for HAV/HEV']
    }
  },
  {
    id: 'hypertension_management',
    title: 'Hypertension Management',
    category: 'disease',
    icdCode: 'BA00',
    summary: 'JNC/AHA guidelines for Stage 1, Stage 2, and Hypertensive Urgency/Emergency, including first-line agents (ACEi, ARBs, CCBs, Thiazides).',
    details: {
      overview: 'Comprehensive blood pressure control protocols to prevent target organ damage.',
      treatment: ['ACE inhibitors', 'Angiotensin Receptor Blockers', 'Calcium Channel Blockers', 'Thiazide diuretics']
    }
  },
  {
    id: 'thyroid_disorders',
    title: 'Hypothyroidism vs. Hyperthyroidism',
    category: 'disease',
    icdCode: '5A00',
    summary: 'Diagnostic interpretation of TSH and Free T4 levels alongside clinical manifestations (e.g., Hashimoto\'s thyroiditis vs. Graves\' disease).',
    details: {
      overview: 'Endocrine disorders of thyroid hormone synthesis and secretion.',
      treatment: ['Levothyroxine for hypothyroidism', 'Methimazole / Radioactive iodine for hyperthyroidism']
    }
  },

  // I
  {
    id: 'immunization_schedules',
    title: 'Immunization Schedules',
    category: 'terminology',
    summary: 'CDC/WHO recommended vaccine timelines across pediatric, adult, and immunocompromised populations.',
    details: {
      overview: 'Preventative medicine protocols providing active immunity against vaccine-preventable infectious diseases.'
    }
  },
  {
    id: 'immunodeficiency_conditions',
    title: 'Immunodeficiency Conditions',
    category: 'disease',
    icdCode: '4A00',
    summary: 'Primary (e.g., SCID, CVID) and secondary (e.g., HIV/AIDS) immune system failures.',
    details: {
      overview: 'Impaired immune response predisposing patients to recurrent opportunistic infections.',
      treatment: ['Immunoglobulin replacement', 'Antiretroviral therapy', 'Hematopoietic stem cell transplant']
    }
  },
  {
    id: 'isolation_precautions',
    title: 'Infectious Disease Isolation Precautions',
    category: 'terminology',
    summary: 'Contact, Droplet, Airborne (N95/negative pressure), and Neutropenic precautions guidelines.',
    details: {
      overview: 'Hospital infection control protocols preventing transmission of nosocomial and contagious pathogens.'
    }
  },
  {
    id: 'ibd',
    title: 'Inflammatory Bowel Disease (IBD)',
    category: 'disease',
    icdCode: 'DD50',
    summary: 'Differentiating Crohn’s Disease (transmural, skip lesions, mouth-to-anus) from Ulcerative Colitis (mucosal, continuous, colon-limited).',
    details: {
      overview: 'Chronic idiopathic inflammatory conditions of the gastrointestinal tract.',
      treatment: ['5-ASA agents', 'Corticosteroids', 'Immunomodulators', 'Biologic anti-TNF therapies']
    }
  },

  // J
  {
    id: 'jaundice',
    title: 'Jaundice (Icterus)',
    category: 'disease',
    icdCode: 'ME23',
    summary: 'Etiological breakdown into Pre-hepatic (hemolytic), Hepatic (hepatocellular), and Post-hepatic (obstructive/cholestatic) hyperbilirubinemia.',
    details: {
      overview: 'Yellowish pigmentation of the skin and sclera caused by elevated serum bilirubin levels.',
      diagnostics: ['Fractionated bilirubin panel', 'Liver ultrasound', 'MRCP']
    }
  },
  {
    id: 'joint_examinations',
    title: 'Joint Examinations',
    category: 'diagnostic',
    summary: 'Specialized physical exam maneuvers for peripheral joints (e.g., Lachman/Drawer tests for ACL, McMurray for meniscal tears).',
    details: {
      overview: 'Orthopedic physical examination techniques for assessing ligamentous stability, meniscal integrity, and joint effusion.'
    }
  },

  // K
  {
    id: 'kidney_injury',
    title: 'Kidney Injury (Acute & Chronic)',
    category: 'disease',
    icdCode: 'GB60',
    summary: 'Staging frameworks (KDIGO/RIFLE) for AKI (Prerenal, Intrinsic, Postrenal) and Chronic Kidney Disease (CKD Stages 1–5 based on eGFR).',
    details: {
      overview: 'Renal impairment classifications guiding nephrology management and dialysis requirements.',
      treatment: ['Fluid management', 'Dietary protein restriction', 'Dialysis for end-stage renal disease']
    }
  },
  {
    id: 'ketoacidosis_types',
    title: 'Ketoacidosis Types',
    category: 'disease',
    icdCode: '5C50',
    summary: 'Differential diagnosis of metabolic acidosis secondary to starvation, alcohol abuse, or diabetes.',
    details: {
      overview: 'Metabolic states characterized by excessive ketone body production leading to high anion gap metabolic acidosis.'
    }
  },

  // L
  {
    id: 'local_anesthetics',
    title: 'Local Anesthetics',
    category: 'drug',
    rxcui: '6423',
    summary: 'Classification (Esters vs. Amides), toxic thresholds, and lipid emulsion resuscitation for Local Anesthesia Systemic Toxicity (LAST).',
    details: {
      overview: 'Reversible blocking agents of nerve conduction (e.g., Lidocaine, Bupivacaine).',
      treatment: ['Lipid emulsion 20% rescue therapy for LAST']
    }
  },
  {
    id: 'lumbar_puncture',
    title: 'Lumbar Puncture (CSF Analysis)',
    category: 'procedure',
    summary: 'Indications, contraindications, opening pressure interpretation, and CSF profiles (Bacterial vs. Viral vs. Fungal meningitis).',
    details: {
      overview: 'Diagnostic procedure accessing cerebrospinal fluid from the lumbar cistern.',
      diagnostics: ['CSF protein, glucose, cell count, Gram stain, and culture']
    }
  },
  {
    id: 'lyme_disease',
    title: 'Lyme Disease',
    category: 'disease',
    icdCode: '1C1A',
    summary: 'Clinical staging (erythema migrans, neurological/cardiac manifestations, Lyme arthritis) and antibiotic regimens (Doxycycline).',
    details: {
      overview: 'Tick-borne spirochetal infection caused by Borrelia burgdorferi transmitted by Ixodes ticks.',
      treatment: ['Oral Doxycycline 100mg twice daily for 14-21 days']
    }
  },

  // M
  {
    id: 'mdd',
    title: 'Major Depressive Disorder (MDD)',
    category: 'disease',
    icdCode: '6A70',
    summary: 'DSM-5 diagnostic criteria (SIGECAPS) and pharmacological management (SSRIs, SNRIs, atypical antidepressants).',
    details: {
      overview: 'Mood disorder characterized by persistent feelings of sadness and loss of interest lasting at least 2 weeks.',
      treatment: ['SSRIs (Sertraline, Escitalopram)', 'Cognitive Behavioral Therapy (CBT)']
    }
  },
  {
    id: 'mechanical_ventilation',
    title: 'Mechanical Ventilation Protocols',
    category: 'procedure',
    summary: 'Modes (AC, SIMV, PSV), settings (FiO2, PEEP, Tidal Volume), and strategies to prevent Ventilator-Induced Lung Injury (VILI).',
    details: {
      overview: 'Critical care respiratory support protocols for acute respiratory failure.',
      treatment: ['Low tidal volume ventilation (6 mL/kg PBW)', 'PEEP titration']
    }
  },
  {
    id: 'medical_ethics',
    title: 'Medical Ethics & Jurisprudence',
    category: 'terminology',
    summary: 'Principles of Autonomy, Beneficence, Non-Maleficence, Justice, Informed Consent, and Advanced Directives.',
    details: {
      overview: 'Core ethical and legal frameworks governing clinical practice and patient care decision-making.'
    }
  },
  {
    id: 'meningitis_bacterial',
    title: 'Meningitis (Acute Bacterial)',
    category: 'disease',
    icdCode: '1A40',
    summary: 'Emergent diagnosis, empiric antimicrobial coverage (Ceftriaxone + Vancomycin +/- Ampicillin), and adjunctive steroid protocols.',
    details: {
      overview: 'Severe bacterial infection of the meninges requiring immediate IV antibiotics and supportive care.',
      treatment: ['Ceftriaxone + Vancomycin + Dexamethasone']
    }
  },
  {
    id: 'microbiology_susceptibility',
    title: 'Microbiology & Antimicrobial Susceptibility',
    category: 'diagnostic',
    summary: 'Minimum Inhibitory Concentration (MIC) concepts, culture techniques, and resistance mechanisms (e.g., MRSA, ESBL, VRE).',
    details: {
      overview: 'Laboratory susceptibility testing guiding targeted anti-infective selection.'
    }
  },

  // N
  {
    id: 'neurological_localizing_signs',
    title: 'Neurological Localizing Signs',
    category: 'diagnostic',
    summary: 'Mapping clinical deficits (motor, sensory, cranial nerve) to specific anatomical lesions in the CNS or PNS.',
    details: {
      overview: 'Clinical neurology principles localizing pathology based on focal deficit patterns.'
    }
  },
  {
    id: 'neuromuscular_junction',
    title: 'Neuromuscular Junction Disorders',
    category: 'disease',
    icdCode: '8C70',
    summary: 'Differentiating Myasthenia Gravis (post-synaptic ACh receptor antibodies) from Lambert-Eaton Syndrome (pre-synaptic calcium channel antibodies).',
    details: {
      overview: 'Autoimmune disorders affecting neuromuscular transmission and muscle contraction.',
      treatment: ['Pyridostigmine, immunosuppression, plasmapheresis']
    }
  },
  {
    id: 'nutritional_deficiencies',
    title: 'Nutritional Deficiencies',
    category: 'disease',
    icdCode: '5B50',
    summary: 'Diagnostic features of vitamin deficiencies (e.g., Thiamine/B1 leading to Wernicke-Korsakoff, B12 leading to Subacute Combined Degeneration).',
    details: {
      overview: 'Clinical syndromes resulting from inadequate micronutrient intake or malabsorption.',
      treatment: ['Targeted vitamin supplementation']
    }
  },

  // O
  {
    id: 'obstetric_emergencies',
    title: 'Obstetric Emergencies',
    category: 'disease',
    icdCode: 'JA00',
    summary: 'Protocols for Eclampsia, Placental Abruption, Placenta Previa, Shoulder Dystocia, and Postpartum Hemorrhage (PPH).',
    details: {
      overview: 'High-risk obstetric conditions requiring urgent maternal-fetal intervention and resuscitation.',
      treatment: ['Magnesium sulfate for eclampsia', 'Emergency cesarean delivery for abruption/previa hemorrhage']
    }
  },
  {
    id: 'opioid_toxicity',
    title: 'Opioid Toxicity & Withdrawal',
    category: 'disease',
    icdCode: '6C43',
    summary: 'Clinical triad of respiratory depression, miosis, and CNS depression; reversal protocols using Naloxone.',
    details: {
      overview: 'Acute overdose presentation managed via airway support and opioid receptor antagonism.',
      treatment: ['Naloxone IV/IN titration', 'Supportive ventilation']
    }
  },
  {
    id: 'osteoarthritis_vs_ra',
    title: 'Osteoarthritis vs. Rheumatoid Arthritis',
    category: 'disease',
    icdCode: 'FA00',
    summary: 'Clinical features, joint involvement patterns (DIP/PIP vs. MCP/PIP), and radiographic findings.',
    details: {
      overview: 'Comparing degenerative joint disease (OA) with systemic autoimmune inflammatory arthritis (RA).',
      treatment: ['Analgesics/NSAIDs for OA', 'DMARDs/Biologics for RA']
    }
  },

  // P
  {
    id: 'pain_management',
    title: 'Pain Management & Palliative Care',
    category: 'terminology',
    summary: 'The WHO Analgesic Ladder, equianalgesic dosing conversions, and end-of-life symptom control.',
    details: {
      overview: 'Clinical protocols ensuring comfort and dignity in chronic and terminal illness.'
    }
  },
  {
    id: 'pancreatitis_acute',
    title: 'Pancreatitis (Acute)',
    category: 'disease',
    icdCode: 'DC30',
    summary: 'Etiologies (gallstones, alcohol), diagnostic criteria (lipase > 3x ULN), and risk stratification (Ranson\'s criteria, APACHE II).',
    details: {
      overview: 'Acute inflammation of the pancreas leading to autodigestion and systemic inflammatory response.',
      treatment: ['Aggressive IV hydration', 'Pain control', 'NPO status / early enteral nutrition']
    }
  },
  {
    id: 'pediatric_milestones',
    title: 'Pediatric Growth & Developmental Milestones',
    category: 'terminology',
    summary: 'Gross motor, fine motor, language, and social milestones from birth through early childhood.',
    details: {
      overview: 'Standardized developmental surveillance framework for pediatric well-child visits.'
    }
  },
  {
    id: 'pharmacokinetics',
    title: 'Pharmacokinetics & Pharmacodynamics',
    category: 'terminology',
    summary: 'Concepts of Half-life (t1/2), Clearance (CL), Volume of Distribution (V_d), Bioavailability (F), and receptor binding mechanisms.',
    details: {
      overview: 'Core pharmacological principles governing drug absorption, distribution, metabolism, excretion, and action.'
    }
  },
  {
    id: 'pneumonia_cap_hap',
    title: 'Pneumonia (CAP vs. HAP/VAP)',
    category: 'disease',
    icdCode: 'CA40',
    summary: 'Risk scoring (CURB-65), microbial etiologies, and recommended empiric antibiotic protocols.',
    details: {
      overview: 'Classification and antibiotic stewardship for community-acquired vs. hospital-acquired pneumonia.',
      treatment: ['Empiric beta-lactam + macrolide for CAP', 'Antipseudomonal coverage for HAP/VAP']
    }
  },
  {
    id: 'psychiatric_emergencies',
    title: 'Psychiatric Emergency Protocols',
    category: 'terminology',
    summary: 'Evaluation and acute intervention for active suicidal ideation, psychosis, and severe agitation.',
    details: {
      overview: 'Crisis stabilization protocols ensuring patient and staff safety in psychiatric settings.'
    }
  },
  {
    id: 'pulmonary_embolism',
    title: 'Pulmonary Embolism (PE)',
    category: 'disease',
    icdCode: 'BB01',
    summary: 'Risk stratification (Wells Score), diagnostic algorithms (D-dimer, CT Pulmonary Angiography), and anticoagulation regimens.',
    details: {
      overview: 'Obstruction of pulmonary arterial bed by thrombus originating from deep venous system.',
      treatment: ['Anticoagulation (DOACs / LMWH)', 'Thrombolytic therapy for massive PE with shock']
    }
  },

  // Q
  {
    id: 'qtc_prolongation',
    title: 'QTc Prolongation',
    category: 'diagnostic',
    summary: 'Causes (medications, electrolyte abnormalities), risk of Torsades de Pointes, and dynamic measurement calculations (Bazett\'s formula).',
    details: {
      overview: 'Electrocardiographic abnormality predisposing to fatal ventricular arrhythmias.',
      treatment: ['Correction of hypokalemia/hypomagnesemia', 'Discontinuation of QT-prolonging drugs']
    }
  },
  {
    id: 'quality_patient_safety',
    title: 'Quality & Patient Safety Metrics',
    category: 'terminology',
    summary: 'Root cause analysis, handoff protocols (SBAR), and infection control strategies.',
    details: {
      overview: 'Institutional frameworks minimizing medical errors and improving healthcare quality outcomes.'
    }
  },

  // R
  {
    id: 'renal_tubular_acidosis',
    title: 'Renal Tubular Acidosis (RTA)',
    category: 'disease',
    icdCode: 'GB40',
    summary: 'Differentiating Type 1 (Distal), Type 2 (Proximal), and Type 4 (Hyperkalemic) RTA based on urinary pH and serum potassium.',
    details: {
      overview: 'Clinical defects in renal tubular acid-base secretion resulting in normal anion gap metabolic acidosis.',
      treatment: ['Oral alkali therapy (sodium bicarbonate)']
    }
  },
  {
    id: 'rheumatic_fever',
    title: 'Rheumatic Fever',
    category: 'disease',
    icdCode: '1D80',
    summary: 'Diagnosis using the Revised Jones Criteria following Group A Streptococcal pharyngitis.',
    details: {
      overview: 'Inflammatory disease occurring as a delayed sequela of streptococcal pharyngitis involving heart, joints, skin, and brain.',
      treatment: ['Penicillin eradication therapy', 'Anti-inflammatory agents (aspirin)']
    }
  },

  // S
  {
    id: 'sepsis_septic_shock',
    title: 'Sepsis & Septic Shock',
    category: 'disease',
    icdCode: '1G40',
    summary: 'Operational definitions (Sepsis-3), qSOFA, SOFA scoring, and the 1-hour bundle (lactate, blood cultures, broad-spectrum antibiotics, crystalloid fluids).',
    details: {
      overview: 'Life-threatening organ dysfunction caused by a dysregulated host response to infection.',
      treatment: ['Broad-spectrum IV antibiotics within 1 hour', 'IV crystalloids (30 mL/kg)', 'Norepinephrine vasopressor support']
    }
  },
  {
    id: 'stis',
    title: 'Sexually Transmitted Infections (STIs)',
    category: 'disease',
    icdCode: '1A70',
    summary: 'Clinical presentation, diagnostic testing, and CDC treatment guidelines for Syphilis, Gonorrhea, Chlamydia, and Herpes Simplex Virus.',
    details: {
      overview: 'Infections transmitted predominantly through sexual contact.',
      treatment: ['Ceftriaxone + Azithromycin/Doxycycline', 'Benzathine penicillin G for syphilis']
    }
  },
  {
    id: 'shock_classifications',
    title: 'Shock Classifications',
    category: 'disease',
    icdCode: 'MG28',
    summary: 'Pathophysiology and hemodynamic profiles of Hypovolemic, Cardiogenic, Distributive (Septic, Anaphylactic, Neurogenic), and Obstructive shock.',
    details: {
      overview: 'State of cellular and tissue hypoxia due to reduced oxygen delivery and/or utilization.',
      treatment: ['Fluid resuscitation, vasopressors, inotropes, or mechanical support tailored to shock etiology']
    }
  },
  {
    id: 'surgical_sutures',
    title: 'Surgical Sutures & Wound Closure',
    category: 'procedure',
    summary: 'Tissue handling principles, suture selection (absorbable vs. non-absorbable, monofilament vs. braided), and removal timelines.',
    details: {
      overview: 'Technical principles of surgical wound closure ensuring optimal tensile strength and cosmesis.'
    }
  },

  // T
  {
    id: 'toxicology_toxidromes',
    title: 'Toxicology & Toxidromes',
    category: 'terminology',
    summary: 'Recognition of classic drug overdose syndromes (Anticholinergic, Cholinergic, Opioid, Sympathomimetic, Sedative-Hypnotic).',
    details: {
      overview: 'Clinical toxidrome recognition guiding emergent antidotal therapy and resuscitation.'
    }
  },
  {
    id: 'trauma_evaluation_atls',
    title: 'Trauma Evaluation (ATLS)',
    category: 'procedure',
    summary: 'Primary survey (Airway, Breathing, Circulation, Disability, Exposure) and secondary survey protocols for polytrauma patients.',
    details: {
      overview: 'Advanced Trauma Life Support systematic approach to life-threatening injuries in polytrauma patients.'
    }
  },
  {
    id: 'tuberculosis',
    title: 'Tuberculosis (TB)',
    category: 'disease',
    icdCode: '1B10',
    summary: 'Latent vs. active TB infection, PPD/IGRA diagnostic testing, and the 4-drug therapy regimen (Rifampin, Isoniazid, Pyrazinamide, Ethambutol).',
    details: {
      overview: 'Airborne infectious disease caused by Mycobacterium tuberculosis affecting primarily the lungs.',
      treatment: ['RIPE therapy (Rifampin, Isoniazid, Pyrazinamide, Ethambutol) for 2 months, followed by RI for 4 months']
    }
  },

  // U
  {
    id: 'ultrasound_pocus',
    title: 'Ultrasound (Point-of-Care / POCUS)',
    category: 'diagnostic',
    summary: 'Bedside diagnostic protocols including FAST (Focused Assessment with Sonography for Trauma), cardiac, and pulmonary imaging.',
    details: {
      overview: 'Clinician-performed ultrasound at the bedside for rapid diagnostic evaluation in emergency and critical care.'
    }
  },
  {
    id: 'urinalysis',
    title: 'Urinalysis Interpretation',
    category: 'diagnostic',
    summary: 'Microscopic and dipstick parameters (leukocyte esterase, nitrites, protein, casts) for renal and urinary tract pathology.',
    details: {
      overview: 'Diagnostic screening test evaluating urine chemistry, sediment, and cellular elements.'
    }
  },

  // V
  {
    id: 'valvular_heart_diseases',
    title: 'Valvular Heart Diseases',
    category: 'disease',
    icdCode: 'BB50',
    summary: 'Auscultation characteristics, murmurs, and management for Aortic Stenosis, Aortic Regurgitation, Mitral Stenosis, and Mitral Regurgitation.',
    details: {
      overview: 'Pathology of cardiac valves resulting in stenosis or regurgitation and altered hemodynamics.',
      treatment: ['Medical management or surgical valve repair / replacement']
    }
  },
  {
    id: 'vasopressors_inotropes',
    title: 'Vasopressors & Inotropes',
    category: 'drug',
    rxcui: '7548',
    summary: 'Receptor profiles (alpha-1, beta-1, beta-2, V1) and clinical indications for Norepinephrine, Epinephrine, Vasopressin, Dopamine, and Dobutamine.',
    details: {
      overview: 'Vasoactive medications used in shock states to restore vascular tone and cardiac contractility.'
    }
  },
  {
    id: 'vte',
    title: 'Venous Thromboembolism (VTE)',
    category: 'disease',
    icdCode: 'BD71',
    summary: 'Prevention, diagnosis, and treatment algorithms for Deep Vein Thrombosis (DVT) and PE.',
    details: {
      overview: 'Formation of blood clots in the deep veins (DVT) with risk of embolization to the lungs (PE).',
      treatment: ['Anticoagulation therapy with LMWH and DOACs']
    }
  },

  // W
  {
    id: 'wound_healing_phases',
    title: 'Wound Healing Phases',
    category: 'terminology',
    summary: 'Cellular and physiological stages of tissue repair: Hemostasis, Inflammation, Proliferation, and Remodeling.',
    details: {
      overview: 'Chronological phases of physiological wound repair and skin regeneration.'
    }
  },
  {
    id: 'who_guidelines',
    title: 'World Health Organization (WHO) Guidelines',
    category: 'terminology',
    summary: 'Global standards for essential medicines, disease control, and clinical triage protocols.',
    details: {
      overview: 'International clinical guidance and essential medicine lists published by the WHO.'
    }
  },

  // X
  {
    id: 'xray_chest',
    title: 'X-Ray Interpretation (Chest)',
    category: 'diagnostic',
    summary: 'Systematic approach to chest radiography evaluation (Airway, Bones, Cardiac, Diaphragm, Extrathoracic tissues, Fields/Lungs).',
    details: {
      overview: 'Standardized ABCDE approach to chest X-ray evaluation in clinical practice.'
    }
  },
  {
    id: 'xanthomas',
    title: 'Xanthomas & Lipid Disorders',
    category: 'disease',
    icdCode: '5C81',
    summary: 'Cutaneous manifestations of underlying severe dyslipidemias and familial hypercholesterolemia.',
    details: {
      overview: 'Deposits of lipid-rich material in skin and tendons indicative of profound lipid abnormalities.'
    }
  },

  // Y
  {
    id: 'yellow_fever',
    title: 'Yellow Fever & Arboviruses',
    category: 'disease',
    icdCode: '1D40',
    summary: 'Vector-borne viral pathogens, clinical features (jaundice, hemorrhage, fever), and global vaccination protocols.',
    details: {
      overview: 'Mosquito-borne viral hemorrhagic fever endemic to tropical regions of Africa and South America.',
      treatment: ['Supportive care and live-attenuated vaccination prevention']
    }
  },

  // Z
  {
    id: 'zoonotic_infections',
    title: 'Zoonotic Infections',
    category: 'disease',
    icdCode: '1C00',
    summary: 'Transmission pathways, diagnosis, and management of diseases vector-passed from animals to humans (e.g., Rabies, Brucellosis, Q Fever, Anthrax).',
    details: {
      overview: 'Infectious diseases naturally transmissible from vertebrate animals to humans.',
      treatment: ['Targeted antimicrobial therapy and post-exposure prophylaxis']
    }
  },
  {
    id: 'zollinger_ellison',
    title: 'Zollinger-Ellison Syndrome',
    category: 'disease',
    icdCode: '5B70',
    summary: 'Gastrin-secreting tumor causing severe refractory peptic ulcer disease; diagnosed via elevated fasting serum gastrin levels.',
    details: {
      overview: 'Gastrinoma (neuroendocrine tumor) located in pancreas or duodenum leading to excessive gastric acid hypersecretion.',
      diagnostics: ['Fasting serum gastrin levels', 'Secretin stimulation test', 'Somatostatin receptor scintigraphy'],
      treatment: ['High-dose Proton Pump Inhibitors (PPIs)', 'Surgical resection of gastrinoma']
    }
  }
];
