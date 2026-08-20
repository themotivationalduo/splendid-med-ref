import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory cache to comply with MedlinePlus AUP (12-24 hour caching)
// and to reduce load on openFDA/RxNorm APIs.
interface CacheEntry {
  data: any;
  timestamp: number;
}
const apiCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

function parseMedlinePlusXml(xml: string) {
  const documents = [];
  // Find all <document>...</document>
  const docRegex = /<document[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/document>/g;
  let docMatch;
  while ((docMatch = docRegex.exec(xml)) !== null) {
    const url = docMatch[1];
    const docInner = docMatch[2];
    
    // Extract title (preserving inner HTML like <span class="qt0">)
    const titleMatch = docInner.match(/<content name="title">([\s\S]*?)<\/content>/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    
    // Extract FullSummary (preserving inner HTML)
    const summaryMatch = docInner.match(/<content name="FullSummary">([\s\S]*?)<\/content>/);
    const summary = summaryMatch ? summaryMatch[1].trim() : "";
    
    if (title || summary) {
      documents.push({ url, title, summary });
    }
  }
  return documents;
}

// Polyfill or use native fetch (Node 18+ has native fetch)
// Create Unified API Endpoint
app.get("/api/medication", async (req, res) => {
  const name = req.query.name as string;
  
  if (!name) {
    res.status(400).json({ error: "Medication name is required" });
    return;
  }

  const cacheKey = name.toLowerCase().trim();
  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`[CACHE HIT] Returning cached data for: ${cacheKey}`);
    res.json(cached.data);
    return;
  }

  try {
    // 1. Get RxNorm RxCUI
    const rxNormUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`;
    const rxNormRes = await fetch(rxNormUrl);
    let rxcui = null;
    if (rxNormRes.ok) {
      try {
        const rxNormData = await rxNormRes.json();
        rxcui = rxNormData.idGroup?.rxnormId?.[0] || null;
      } catch (e) { console.error("RxNorm CUI Parse Error", e); }
    }

    let interactions = null;
    if (rxcui) {
      // 2. Get RxNorm Interactions
      const interactionsUrl = `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}`;
      const intRes = await fetch(interactionsUrl);
      if (intRes.ok) {
        try {
          const intData = await intRes.json();
          interactions = intData.interactionTypeGroup?.[0]?.interactionType?.[0]?.interactionPair || [];
        } catch (e) { console.error("RxNorm Interactions Parse Error", e); }
      }
    }

    // 3. Get openFDA Label Data
    // We search both generic_name and brand_name
    let fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"+openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`;
    if (process.env.OPENFDA_API_KEY) {
      fdaUrl += `&api_key=${process.env.OPENFDA_API_KEY}`;
    }
    const fdaRes = await fetch(fdaUrl);
    let fdaData = null;
    if (fdaRes.ok) {
        const json = await fdaRes.json();
        fdaData = json.results?.[0] || null;
    }

    // 4. Get MedlinePlus Health Topics
    // Added 'tool' and 'email' parameters per MedlinePlus Acceptable Use Policy
    const tool = "SplendidMediRef";
    const email = "admin@splendidmediref.local";
    const medlineUrl = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(name)}&rettype=brief&tool=${tool}&email=${email}`;
    const medlineRes = await fetch(medlineUrl);
    let medlineData = null;
    if (medlineRes.ok) {
        const xmlText = await medlineRes.text();
        medlineData = parseMedlinePlusXml(xmlText);
    }

    // Assemble the Splendid Medi-Ref Unified Schema
    const unifiedResponse = {
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
      interactions: interactions?.map((pair: any) => ({
        description: pair.description,
        severity: pair.severity,
        interacting_drug: pair.interactionConcept?.[1]?.sourceConceptItem?.name
      })) || [],
      medlinePlus: medlineData || [],
      fhirResources: {
        medicationStatements: [
          {
            resourceType: 'MedicationStatement',
            id: `medstmt-${rxcui || name.toLowerCase()}`,
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
          id: `cond-${idx}-${name.toLowerCase()}`,
          clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }] },
          code: { text: ind.substring(0, 120) }
        })) : [],
        observations: fdaData?.warnings ? fdaData.warnings.slice(0, 1).map((warn: string, idx: number) => ({
          resourceType: 'Observation',
          id: `obs-${idx}-${name.toLowerCase()}`,
          status: 'final',
          code: { text: 'FDA Safety Warning / Observation' },
          valueString: warn.substring(0, 200)
        })) : []
      },
      disclaimer: "MEDICAL DISCLAIMER: This aggregated information is for educational and reference purposes only. It does not constitute medical advice. Always consult a qualified healthcare provider for diagnosis and treatment."
    };

    // Store in cache
    apiCache.set(cacheKey, {
      data: unifiedResponse,
      timestamp: Date.now()
    });

    res.json(unifiedResponse);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ 
        error: "Failed to fetch medical data",
        details: error instanceof Error ? error.message : "Unknown error",
        disclaimer: "MEDICAL DISCLAIMER: This aggregated information is for educational and reference purposes only. It does not constitute medical advice. Always consult a qualified healthcare provider for diagnosis and treatment."
    });
  }
});

// WHO ICD-11 API Integration Endpoint
let cachedIcdToken: { token: string; expiresAt: number } | null = null;

async function getIcdAccessToken(): Promise<string | null> {
  const clientId = process.env.WHO_CLIENT_ID;
  const clientSecret = process.env.WHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedIcdToken && Date.now() < cachedIcdToken.expiresAt) {
    return cachedIcdToken.token;
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "icdapi_access");

    const tokenRes = await fetch("https://icdaccessmanagement.who.int/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!tokenRes.ok) {
      console.error("WHO ICD Token Auth Failed:", await tokenRes.text());
      return null;
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    const expiresIn = (tokenData.expires_in || 3600) * 1000;
    cachedIcdToken = {
      token,
      expiresAt: Date.now() + expiresIn - 60000 // buffer 1 min
    };
    return token;
  } catch (e) {
    console.error("WHO ICD Token Error:", e);
    return null;
  }
}

app.get("/api/icd/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const token = await getIcdAccessToken();
  if (!token) {
    res.status(503).json({ 
      error: "WHO ICD API credentials not configured or token exchange failed.",
      instructions: "Please provide WHO_CLIENT_ID and WHO_CLIENT_SECRET in the settings/secrets to enable ICD-11 live search."
    });
    return;
  }

  try {
    const icdUrl = `https://id.who.int/icd/release/11/mms/search?q=${encodeURIComponent(q)}`;
    const icdRes = await fetch(icdUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "API-Version": "v2",
        "Accept": "application/json",
        "Accept-Language": "en"
      }
    });

    if (!icdRes.ok) {
      const errText = await icdRes.text();
      res.status(icdRes.status).json({ error: "ICD API error", details: errText });
      return;
    }

    const icdData = await icdRes.json();
    res.json(icdData);
  } catch (e) {
    console.error("ICD Search Error:", e);
    res.status(500).json({ error: "Failed to query ICD-11 API", details: e instanceof Error ? e.message : String(e) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
