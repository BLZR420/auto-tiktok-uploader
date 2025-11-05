// Robust Proxy for Prepare (multipart) and Publish (JSON)
// - Liest multipart sauber aus, setzt fehlende Felder (mode, filename, content-type)
// - Baut ein frisches FormData für Make (vermeidet Boundary/Encoding-Probleme)
// - Publish (JSON) wird 1:1 weitergereicht

export const config = {
  // Node-Runtime, die req.formData() unterstützt
  runtime: "nodejs"
};

export default async function handler(req, res) {
  // <<< HIER: Webhook-URL deines Szenario B2 eintragen >>>
  const MAKE_WEBHOOK = "https://hook.eu2.make.com/f0b0veoesc03nmhyspeernqtn0ybaq8t";

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ct = (req.headers["content-type"] || "").toLowerCase();

    // =========================
    // PREPARE: multipart/form-data
    // =========================
    if (ct.includes("multipart/form-data")) {
      const inForm = await req.formData();

      // Felder auslesen
      let mode = (inForm.get("mode") || "").toString().toLowerCase();
      let caption = (inForm.get("caption") || "").toString();
      let visibility = ((inForm.get("visibility") || "self") + "").toLowerCase();
      let file = inForm.get("file");

      // Defaults/Normalisierung
      if (!mode) mode = "prepare";
      if (!["self", "public", "friends"].includes(visibility)) visibility = "self";

      // Prüfen, ob Datei vorhanden ist
      if (!file || typeof file.arrayBuffer !== "function") {
        return res.status(400).json({ ok: false, error: "No 'file' field or not a file" });
      }

      // Blob -> Buffer und saubere File-Metadaten setzen
      const buf = Buffer.from(await file.arrayBuffer());
      const filename = (file.name && typeof file.name === "string" && file.name.trim())
        ? cleanFilename(file.name)
        : "video.mp4"; // Fallback
      const mime = (file.type && typeof file.type === "string" && file.type.trim())
        ? file.type
        : "video/mp4";

      // Frisches FormData für Make aufbauen (clean)
      const outForm = new FormData();
      outForm.set("mode", mode);
      outForm.set("caption", caption);
      outForm.set("visibility", visibility);
      // Wichtig: neuen Blob mit korrektem MIME + solidem Dateinamen anlegen
      outForm.set("file", new Blob([buf], { type: mime }), filename);

      // An Make weiterreichen
      const makeResp = await fetch(MAKE_WEBHOOK, {
        method: "POST",
        body: outForm
      });

      const text = await makeResp.text();
      try {
        return res.status(makeResp.status).json(JSON.parse(text));
      } catch {
        return res.status(makeResp.status).json({ ok: makeResp.ok, raw: text });
      }
    }

    // =========================
    // PUBLISH: JSON
    // =========================
    const body = await readJson(req);

    // Absicherung: mode auf publish setzen
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

// Hilfsfunktionen
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

function cleanFilename(name) {
  // Entfernt problematische Zeichen, die Make/Webhook-Parser beim Einlernen triggern können
  return name.replace(/[^A-Za-z0-9._-]/g, "_");
}
