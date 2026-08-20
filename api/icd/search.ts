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
      expiresAt: Date.now() + expiresIn - 60000
    };
    return token;
  } catch (e) {
    console.error("WHO ICD Token Error:", e);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const q = (req.query?.q || req.body?.q) as string;
  if (!q) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const token = await getIcdAccessToken();
  if (!token) {
    res.status(503).json({ 
      error: "WHO ICD API credentials not configured or token exchange failed.",
      instructions: "Please provide WHO_CLIENT_ID and WHO_CLIENT_SECRET in the environment variables to enable ICD-11 live search."
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
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(icdData);
  } catch (e) {
    console.error("ICD Search Error:", e);
    res.status(500).json({ error: "Failed to query ICD-11 API", details: e instanceof Error ? e.message : String(e) });
  }
}
