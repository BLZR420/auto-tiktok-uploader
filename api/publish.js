// Simple proxy to your Make scenario with two modes:
//  - mode=prepare  -> multipart (file + caption + visibility) -> Make does INIT + PUT, returns publish_id
//  - mode=publish  -> JSON (publish_id + caption + visibility) -> Make does COMPLETE

export const config = {
  runtime: 'nodejs' // ensures req.formData() support on Vercel Node runtimes
};

export default async function handler(req, res) {
  const MAKE_WEBHOOK = "https://hook.eu2.make.com/cfqx7djvanyhxdjtikprf0dhhhkpp254"; // <-- CHANGE ME

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const ct = (req.headers['content-type'] || '').toLowerCase();

    // Multipart -> PREPARE
    if (ct.includes('multipart/form-data')) {
      // Forward the same multipart form to Make, plus mode=prepare
      const form = await req.formData();

      // Ensure mode=prepare (even if the browser sent it, we overwrite to be safe)
      form.set('mode', 'prepare');

      const makeResp = await fetch(MAKE_WEBHOOK, { method: 'POST', body: form });
      const text = await makeResp.text();

      // Try to parse JSON; if not JSON, wrap raw text
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch {
        return res.status(200).json({ ok: makeResp.ok, raw: text });
      }
    }

    // JSON -> PUBLISH
    const body = await readJson(req);
    body.mode = 'publish';

    const makeResp = await fetch(MAKE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await makeResp.text();
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).json({ ok: makeResp.ok, raw: text });
    }

  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}

async function readJson(req) {
  // Vercel Node 18: req.body may be a stream; safest is to buffer
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8') || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}
