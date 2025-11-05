// Ultra-simple Proxy: leitet den Request 1:1 an deinen Make-Webhook weiter
// - multipart/form-data (Prepare) wird unverändert durchgestreamt
// - JSON (Publish) ebenso
// Keine Regex-Validierung, kein eigenes Parsen, keine Header-Manipulation außer Content-Type-Forwarding

export const config = {
  runtime: "nodejs" // wichtig für Vercel/Node 18
};

export default async function handler(req, res) {
  // <<< HIER DEINE NEUE WEBHOOK-URL EINFÜGEN (für PREPARE + PUBLISH, NICHT die Token-Webhook) >>>
  const MAKE_WEBHOOK = "https://hook.eu2.make.com/f0b0veoesc03nmhyspeernqtn0ybaq8t";

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Nur den Content-Type weiterreichen (wichtig für multipart Boundary)
    const ct = req.headers["content-type"] || "";
    const headers = new Headers();
    if (ct) headers.set("content-type", ct);

    // Body ungeöffnet streamen (keine formData()/JSON-Verarbeitung!)
    const makeResp = await fetch(MAKE_WEBHOOK, {
      method: "POST",
      headers,
      body: req
    });

    // Antwort möglichst als JSON zurückgeben, sonst raw
    const text = await makeResp.text();
    try {
      const json = JSON.parse(text);
      return res.status(makeResp.status).json(json);
    } catch {
      return res
        .status(makeResp.status)
        .json({ ok: makeResp.ok, status: makeResp.status, raw: text });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Proxy failed" });
  }
}
