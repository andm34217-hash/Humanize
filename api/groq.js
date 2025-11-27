export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, mode } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in Vercel" });
    }

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const payload = {
      model: "llama3-8b-8192",
      messages: [
        {
          role: "user",
          content:
            mode === "rewrite"
              ? `Rescrie textul următor în stil uman, clar, simplu, fără expresii specifice AI. Text: ${text}`
              : `Creează un rezumat pe puncte al acestui text: ${text}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    };

    const groqRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await groqRes.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      return res.status(500).json({
        error: "Groq API returned an invalid response",
        details: data,
      });
    }

    res.status(200).json({
      result: data.choices[0].message.content,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server crashed", details: err.message });
  }
}
