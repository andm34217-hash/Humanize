// /api/groq.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ API key" });
    }

    const model =
      mode === "summary"
        ? "mixtral-8x7b-32768"
        : "llama3-70b-8192";

    const prompt =
      mode === "summary"
        ? `Rezuma într-o listă de 5–8 puncte informațiile esențiale:\n\n${text}`
        : `Rescrie textul într-un stil natural, uman, evitând frazele lungi și formulările robotice. Păstrează sensul original:\n\n${text}`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await groqRes.json();

    return res.status(200).json({
      result: data.choices?.[0]?.message?.content || "Eroare în generare",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
