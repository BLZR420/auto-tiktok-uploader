// Proxy für Prepare (multipart) & Publish (JSON) – Vercel Node Runtime
// - Body wird 1:1 gestreamt (multipart bleibt intakt)
// - "mode" wird als Query-Parameter an die Make-Webhook-URL gehängt
//   => In Make kannst du per {{query.mode}} sicher filtern

export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  const MAKE_WEBHOOK_BASE = "https://hook.eu2.make.com/f0b0veoesc03nmhyspeernqtn0ybaq8t"; // <— HIER eintragen

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ct = req.headers["content-type"] || "";
    let targetUrl;
    let resp;

    // PREPARE → multipart/form-data
    if (ct.toLowerCase().includes("multipart/form-data")) {
      // "mode=prepare" als Query-Param anfügen (Body bleibt unverändert)
      targetUrl = appendQuery(MAKE_WEBHOOK_BASE, { mode: "prepare" });

      resp = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": ct }, // Boundary muss 1:1 durch
        body: req                          // Stream ungeöffnet weiterreichen
      });
    } else {
      // PUBLISH → JSON
      const raw = await readRaw(req);
      let body = {};
      try { body = JSON.parse(raw); } catch { body = {}; }
      body.mode = "publish";

      targetUrl = appendQuery(MAKE_WEBHOOK_BASE, { mode: "publish" });

      resp = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    const text = await resp.text();
    try {
      return res.status(resp.status).json(JSON.parse(text));
    } catch {
      return res.status(resp.status).json({ ok: resp.ok, raw: text });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Proxy failed" });
  }
}

function appendQuery(base, obj) {
  const url = new URL(base);
  for (const [k, v] of Object.entries(obj)) url.searchParams.set(k, v);
  return url.toString();
}

async function readRaw(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks).toString("utf8");
}
