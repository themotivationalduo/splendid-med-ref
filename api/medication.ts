import { fetchDirectMedicationData } from '../src/lib/medicationService';

// Vercel Serverless Function handler for /api/medication
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const name = (req.query?.name || req.body?.name) as string;

  if (!name) {
    res.status(400).json({ error: "Medication name is required" });
    return;
  }

  try {
    const data = await fetchDirectMedicationData(name);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (error) {
    console.error("Vercel Medication API Error:", error);
    res.status(500).json({
      error: "Failed to fetch medical data",
      details: error instanceof Error ? error.message : "Unknown error",
      disclaimer: "MEDICAL DISCLAIMER: This aggregated information is for educational and reference purposes only. It does not constitute medical advice. Always consult a qualified healthcare provider for diagnosis and treatment."
    });
  }
}
