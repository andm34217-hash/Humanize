import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode } = req.body;

    if (!text || !mode) {
      return res.status(400).json({ error: "Missing input text or mode." });
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
    }

    let result;
    if (mode === "rewrite") {
      result = await rewriteText(client, text);
    } else if (mode === "summary") {
      result = await summarizeText(client, text);
    } else {
      return res.status(400).json({ error: "Invalid mode" });
    }

    return res.status(200).json({ result });
  } catch (error) {
    console.error("GROQ ERROR:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}

/* ---------------------------------------- */
/* RESCRIE TEXT                             */
/* ---------------------------------------- */
async function rewriteText(client, text) {
  const prompt = `
Rescrie următorul text într-un mod natural, uman și fluent.
Păstrează sensul, îmbunătățește claritatea și fă-l ușor de citit.

Text:
${text}
  `;

  const response = await client.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [
      { role: "system", content: "Ești un asistent care rescrie text în mod natural și uman." },
      { role: "user", content: prompt }
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "Eroare: răspuns invalid.";
}

/* ---------------------------------------- */
/* REZUMĂ TEXT                               */
/* ---------------------------------------- */
async function summarizeText(client, text) {
  const prompt = `
Fă un rezumat scurt, clar și ușor de înțeles.
Folosește bullet points dacă ajută.

Text:
${text}
  `;

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Ești un asistent care face rezumate concise." },
      { role: "user", content: prompt }
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || "Eroare: răspuns invalid.";
}
