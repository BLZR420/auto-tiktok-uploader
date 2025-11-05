// Relay für deine Make-Szenarien mit zwei Modi:
//  mode=prepare  -> multipart (file + caption + visibility) -> Make INIT + Upload
//  mode=publish  -> JSON (publish_id + caption + visibility) -> Make COMPLETE

export const config = {
  runtime: 'nodejs18.x'  // Wichtig für Vercel – unterstützt FormData
};

export default async function handler(req, res) {
  const MAKE_WEBHOOK = "https://hook.eu2.make.com/f0b0veoesc03nmhyspeernqtn0ybaq8t"; // <<< HIER EINTRAGEN

  // --- Webhook URL Validierung (EU/US/… erlaubt) ---
  const urlOk = /^https:\/\/hook(\.[a-z0-9-]+)?\.make\.com\/[A-Za-z0-9_-]+$/.test(MAKE_WEBHOOK);
  if (!urlOk) {
    return res.status(500).json({ ok: false, error: "Invalid MAKE_WEBHOOK URL format" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ct = (req.headers["content-type"] || "").toLowerCase();

    // ----------------------
    // PREPARE (multipart)
    // ----------------------
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();

      // Override mode to be safe
      form.set("mode", "prepare");

      const makeResp = await fetch(MAKE_WEBHOOK, {
        method: "POST",
        body: form
      });

      const text = await makeResp.text();
      try {
        return res.status(makeResp.status).json(JSON.parse(text));
      } catch {
        return res.status(makeResp.status).json({ ok: makeResp.ok, raw: text });
      }
    }

    // ----------------------
    // PUBLISH (JSON)
    // ----------------------
    const body = await readJson(req);
    body.mode = "publish";

    const makeResp = await fetch(MAKE_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const text = await makeResp.text();
    try {
      return res.status(makeResp.status).json(JSON.parse(text));
    } catch {
      return res.status(makeResp.status).json({ ok: makeResp.ok, raw: text });
    }

  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
}

// JSON Body einlesen (funktioniert auch bei Vercel Streaming Requests)
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
