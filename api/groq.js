export default async function handler(req, res) {
  try {
    const { text, mode } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ API key" });
    }

    let systemPrompt = "";

    // Mode = rescriere, detectare, rezumat
    switch (mode) {
      case "rewrite":
        systemPrompt =
          "Rescrie textul într-un stil natural de student român, clar, coerent, fără expresii artificiale, fără repetiții și fără formulări tehnice sau specifice AI. Evită introducerile de tipul 'În esență', 'Pe scurt', 'În realitate'. Menține sensul original, dar exprimă-l într-o manieră umană, simplă și fluentă.";
        break;

      case "summary":
        systemPrompt =
          "Extrage cele mai importante idei din text și oferă-le sub forma unei liste cu bullet points. Fii concis, păstrează sensul original.";
        break;

      case "detect":
        systemPrompt =
          "Analizează dacă textul pare generat de un AI. Oferă un scor între 0 și 100 în format JSON: {score: numar}. Nu adăuga explicații.";
        break;

      default:
        systemPrompt = "Ești un asistent AI util.";
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();

    if (mode === "detect") {
      try {
        const parsed = JSON.parse(data.choices?.[0]?.message?.content);
        return res.status(200).json({ score: parsed.score });
      } catch {
        return res.status(200).json({ score: 50 }); // fallback
      }
    }

    return res.status(200).json({
      result: data.choices?.[0]?.message?.content || ""
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
