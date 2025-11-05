// /api/publish.js — Safe Mode + Diagnose
// Ziel: Erst sicherstellen, dass die Web-App funktioniert (ohne Make).
// Danach MAKE_FORWARD = true setzen, um an Make zu forwarden.

export const config = { runtime: "nodejs" };

// === Schalter ===
const MAKE_FORWARD = false; // <-- ZUERST: false (Safe Mode). Wenn Prepare grün ist: true setzen.
const MAKE_WEBHOOK_BASE = "https://hook.eu2.make.com/f0b0veoesc03nmhyspeernqtn0ybaq8t"; // <-- Deine B2-Webhook-URL (Szenario mit Router)

// === Hilfsfunktionen ===
async function readRaw(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks);
}
function withQuery(base, obj) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(obj)) u.searchParams.set(k, String(v));
  return u.toString();
}
function guessFilename(ct) {
  // nur kosmetisch; Dateiname ist für Diagnose egal
  const ts = Date.now();
  if (ct.includes("quicktime")) return `upload_${ts}.mov`;
  return `upload_${ts}.mp4`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ct = (req.headers["content-type"] || "").toLowerCase();

    // ============ PREPARE (multipart/form-data) ============
    if (ct.includes("multipart/form-data")) {
      const raw = await readRaw(req); // NICHT parsen, nur lesen (Boundary bleibt intakt)
      const size = raw.length;
      const filename = guessFilename(ct);

      // --- SAFE MODE: antworte immer erfolgreich, ohne Make ---
      if (!MAKE_FORWARD) {
        // Antwort, die dein Frontend erwartet:
        return res.status(200).json({
          ok: true,
          step: "prepared",
          publish_id: "TEST_PUBLISH_ID",
          diag: {
            mode: "prepare",
            contentType: ct,
            bytes: size,
            filename
          }
        });
      }

      // --- Forward an Make (mit Query-Param mode=prepare) ---
      const targetUrl = withQuery(MAKE_WEBHOOK_BASE, { mode: "prepare" });
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": req.headers["content-type"] || "" },
        body: raw
      });

      const text = await upstream.text();
      try { return res.status(upstream.status).json(JSON.parse(text)); }
      catch { return res.status(upstream.status).json({ ok: upstream.ok, raw: text }); }
    }

    // ============ PUBLISH (JSON) ============
    const raw = await readRaw(req);
    let body = {};
    try { body = JSON.parse(raw.toString("utf8")); } catch { body = {}; }
    body.mode = "publish";

    if (!MAKE_FORWARD) {
      // SAFE MODE: Dummy-Erfolg für Publish
      return res.status(200).json({ ok: true, step: "published", echo: body });
    }

    const targetUrl = withQuery(MAKE_WEBHOOK_BASE, { mode: "publish" });
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const text = await upstream.text();
    try { return res.status(upstream.status).json(JSON.parse(text)); }
    catch { return res.status(upstream.status).json({ ok: upstream.ok, raw: text }); }

  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Proxy failed" });
  }
}
