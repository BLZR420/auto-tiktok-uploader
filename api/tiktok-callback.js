export default async function handler(req, res) {
  try {
    const { query } = req;
    // (Optional) State-Check – wenn du in Make speicherst, hier validieren
    // const expected = ...; if (query.state !== expected) return res.status(400).send("Invalid state");

    // An Make weiterreichen (nur Code+State), falls du dort Token tauschst
    const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/cfqx7djvanyhxdjtikprf0dhhhkpp254"; // <-- ersetzen
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query)
      });
    } catch { /* Make ist optional – UI soll trotzdem weitergehen */ }

    // Zurück zur Startseite mit Flag
    res.writeHead(302, { Location: "/?connected=1" });
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
