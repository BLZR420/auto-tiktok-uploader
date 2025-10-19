export default async function handler(req, res) {
  const { query } = req; // contains ?code=...&state=...

  // 1) HIER deine NEUE Make-Webhook-URL (Production) einsetzen
  const makeWebhook = "https://hook.eu2.make.com/f0b0veoesc03nmhyspeernqtn0ybaq8t?secret=mySuperSecret123";

  // 2) Secret MUSS mit der Filter-Prüfung in Make übereinstimmen
  const SECRET = "mySuperSecret123";

  try {
    await fetch(makeWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Secret": SECRET
      },
      // Wir senden die TikTok-Parameter als JSON-Body
      body: JSON.stringify(query)
    });

    // Nach Erfolg zurück auf deine Landing-Page
    res.redirect("/?connected=1");
  } catch (err) {
    res.status(500).send("Error forwarding TikTok callback.");
  }
}
