// Proxy für Prepare (multipart) & Publish (JSON) – Vercel Node Runtime
// - multipart wird roh 1:1 weitergeleitet (Boundary bleibt intakt)
// - JSON wird gelesen und mit mode="publish" weitergeschickt
// - query.mode (= prepare/publish) wird zusätzlich an die Webhook-URL gehängt,
//   damit du in Make stabil auf {{query.mode}} filtern kannst.

export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  const MAKE_WEBHOOK_BASE = "https://hook.eu2.make.com/f0b0veoesc03nmhyspeernqtn0ybaq8t"; // <— HIER einsetzen

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ct = (req.headers["content-type"] || "").toLowerCase();
    let targetUrl;
    let upstream;

    if (ct.includes("multipart/form-data")) {
      // PREPARE: multipart
      targetUrl = withQuery(MAKE_WEBHOOK_BASE, { mode: "prepare" });
      upstream = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": req.headers["content-type"] || "" },
        body: await readRaw(req) // als Buffer weiterleiten
      });
    } else {
      // PUBLISH: JSON
      const raw = (await readRaw(req)).toString("utf8");
      let body = {};
      try { body = JSON.parse(raw); } catch { body = {}; }
      body.mode = "publish";

      targetUrl = withQuery(MAKE_WEBHOOK_BASE, { mode: "publish" });
      upstream = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    const text = await upstream.text();
    try {
      return res.status(upstream.status).json(JSON.parse(text));
    } catch {
      return res.status(upstream.status).json({ ok: upstream.ok, raw: text });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Proxy failed" });
  }
}

function withQuery(base, obj) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(obj)) u.searchParams.set(k, String(v));
  return u.toString();
}

async function readRaw(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks);
}
