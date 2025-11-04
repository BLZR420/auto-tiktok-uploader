export const config = {
  api: { bodyParser: false } // wir lesen FormData selbst
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/cfqx7djvanyhxdjtikprf0dhhhkpp254"; // <-- ersetzen

  // FormData auslesen
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);

  // 1:1 an Make weiterleiten (inkl. Datei)
  const r = await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": req.headers["content-type"] || "application/octet-stream" },
    body: raw
  });

  const txt = await r.text();
  if (!r.ok) return res.status(r.status).json({ error: txt });
  // Make kann JSON oder Text antworten – zur Sicherheit:
  try { return res.status(200).json(JSON.parse(txt)); }
  catch { return res.status(200).json({ ok: true, data: txt }); }
}
