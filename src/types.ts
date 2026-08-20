export interface FHIRCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRReference {
  reference?: string;
  display?: string;
}

export interface FHIRCondition {
  resourceType: 'Condition';
  id?: string;
  clinicalStatus?: FHIRCodeableConcept;
  verificationStatus?: FHIRCodeableConcept;
  category?: FHIRCodeableConcept[];
  severity?: FHIRCodeableConcept;
  code?: FHIRCodeableConcept;
  subject?: FHIRReference;
  onsetDateTime?: string;
  recordedDate?: string;
  note?: Array<{ text?: string }>;
}

export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id?: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold';
  medicationCodeableConcept?: FHIRCodeableConcept;
  subject?: FHIRReference;
  effectiveDateTime?: string;
  dosage?: Array<{
    text?: string;
    timing?: { repeat?: { frequency?: number; period?: number; periodUnit?: string } };
    route?: FHIRCodeableConcept;
    doseAndRate?: Array<{ doseQuantity?: { value?: number; unit?: string } }>;
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject?: FHIRReference;
  effectiveDateTime?: string;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  interpretation?: FHIRCodeableConcept[];
  referenceRange?: Array<{
    low?: { value?: number; unit?: string };
    high?: { value?: number; unit?: string };
    text?: string;
  }>;
}

export interface UnifiedMedicalData {
  query: string;
  rxcui: string | null;
  fdaLabel: {
    id: string;
    brand_name?: string[];
    generic_name?: string[];
    warnings?: string[];
    indications_and_usage?: string[];
    adverse_reactions?: string[];
    contraindications?: string[];
  } | null;
  interactions: Array<{
    description: string;
    severity: string;
    interacting_drug: string;
  }>;
  medlinePlus: Array<{
    title: string;
    summary: string;
    url: string;
  }>;
  disclaimer: string;
  fhirResources?: {
    conditions?: FHIRCondition[];
    medicationStatements?: FHIRMedicationStatement[];
    observations?: FHIRObservation[];
  };
}

export interface MedicalEntity {
  id: string;
  title: string;
  category: 'disease' | 'drug' | 'anatomy' | 'procedure' | 'diagnostic' | 'terminology';
  summary: string;
  dosage?: string;
  administration?: string;
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
