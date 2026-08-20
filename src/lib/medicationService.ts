export function parseMedlinePlusXml(xml: string) {
  const documents: Array<{ url: string; title: string; summary: string }> = [];
  const docRegex = /<document[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/document>/g;
  let docMatch;
  while ((docMatch = docRegex.exec(xml)) !== null) {
    const url = docMatch[1];
    const docInner = docMatch[2];
    
    const titleMatch = docInner.match(/<content name="title">([\s\S]*?)<\/content>/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    
    const summaryMatch = docInner.match(/<content name="FullSummary">([\s\S]*?)<\/content>/);
    const summary = summaryMatch ? summaryMatch[1].trim() : "";
    
    if (title || summary) {
      documents.push({ url, title, summary });
    }
  }
  return documents;
}

export async function fetchDirectMedicationData(name: string) {
  const cacheKey = name.toLowerCase().trim();
  
  // 1. Get RxNorm RxCUI
  let rxcui: string | null = null;
  try {
    const rxNormUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`;
    const rxNormRes = await fetch(rxNormUrl);
    if (rxNormRes.ok) {
      const rxNormData = await rxNormRes.json();
      rxcui = rxNormData.idGroup?.rxnormId?.[0] || null;
    }
  } catch (e) {
    console.warn("RxNorm CUI Fetch Warning:", e);
  }

  // 2. Get RxNorm Interactions
  let interactions: any[] = [];
  if (rxcui) {
    try {
      const interactionsUrl = `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}`;
      const intRes = await fetch(interactionsUrl);
      if (intRes.ok) {
        const intData = await intRes.json();
        interactions = intData.interactionTypeGroup?.[0]?.interactionType?.[0]?.interactionPair || [];
      }
    } catch (e) {
      console.warn("RxNorm Interactions Fetch Warning:", e);
    }
  }

  // 3. Get openFDA Label Data
  let fdaData: any = null;
  try {
    const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"+openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`;
    const fdaRes = await fetch(fdaUrl);
    if (fdaRes.ok) {
      const json = await fdaRes.json();
      fdaData = json.results?.[0] || null;
    }
  } catch (e) {
    console.warn("openFDA Label Fetch Warning:", e);
  }

  // 4. Get MedlinePlus Health Topics
  let medlineData: any[] = [];
  try {
    const tool = "SplendidMediRef";
    const email = "admin@splendidmediref.local";
    const medlineUrl = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(name)}&rettype=brief&tool=${tool}&email=${email}`;
    const medlineRes = await fetch(medlineUrl);
    if (medlineRes.ok) {
      const xmlText = await medlineRes.text();
      medlineData = parseMedlinePlusXml(xmlText);
    }
  } catch (e) {
    console.warn("MedlinePlus Fetch Warning:", e);
  }

  // Assemble Unified Schema
  return {
    query: name,
    rxcui: rxcui,
    fdaLabel: fdaData ? {
      id: fdaData.id,
      brand_name: fdaData.openfda?.brand_name,
      generic_name: fdaData.openfda?.generic_name,
      warnings: fdaData.warnings || fdaData.boxed_warning,
      indications_and_usage: fdaData.indications_and_usage,
      adverse_reactions: fdaData.adverse_reactions,
      contraindications: fdaData.contraindications,
    } : null,
    interactions: interactions.map((pair: any) => ({
      description: pair.description,
      severity: pair.severity,
      interacting_drug: pair.interactionConcept?.[1]?.sourceConceptItem?.name
    })),
    medlinePlus: medlineData,
    fhirResources: {
      medicationStatements: [
        {
          resourceType: 'MedicationStatement',
          id: `medstmt-${rxcui || cacheKey}`,
          status: 'active',
          medicationCodeableConcept: {
            text: name,
            coding: rxcui ? [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: rxcui, display: name }] : []
          },
          effectiveDateTime: new Date().toISOString(),
          dosage: fdaData?.dosage_and_administration ? [{ text: fdaData.dosage_and_administration[0] }] : []
        }
      ],
      conditions: fdaData?.indications_and_usage ? fdaData.indications_and_usage.slice(0, 2).map((ind: string, idx: number) => ({
        resourceType: 'Condition',
        id: `cond-${idx}-${cacheKey}`,
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
        code: { text: ind.substring(0, 120) }
      })) : [],
      observations: fdaData?.warnings ? fdaData.warnings.slice(0, 1).map((warn: string, idx: number) => ({
        resourceType: 'Observation',
        id: `obs-${idx}-${cacheKey}`,
        status: 'final',
        code: { text: 'FDA Safety Warning / Observation' },
        valueString: warn.substring(0, 200)
      })) : []
    },
    disclaimer: "MEDICAL DISCLAIMER: This aggregated information is for educational and reference purposes only. It does not constitute medical advice. Always consult a qualified healthcare provider for diagnosis and treatment."
  };
}
