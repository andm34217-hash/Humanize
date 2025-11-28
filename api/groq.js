// Forțăm Node runtime (groq-sdk nu merge pe Edge)
export const config = {
  runtime: "nodejs"
};

import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode } = req.body;

    if (!text || !mode) {
      return res.status(400).json({ error: "Missing text or mode" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let result;

    if (mode === "rewrite") {
      result = await rewriteText(client, text);
    } else if (mode === "summary") {
      result = await summarizeText(client, text);
    } else if (mode === "detect") {
      result = await detectAI(client, text);
    } else {
      return res.status(400).json({ error: "Invalid mode" });
    }

    return res.status(200).json({ result });

  } catch (err) {
    console.error("GROQ ERROR:", err);
    const message = err?.response?.data || err?.message || "Server error";
    return res.status(500).json({ error: String(message) });
  }
}

/* ----------------- RESCRIERE ----------------- */
async function rewriteText(client, text) {
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Rescrie natural, clar, uman." },
      { role: "user", content: text }
    ],
    max_tokens: 800,
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

/* ----------------- REZUMAT ----------------- */
async function summarizeText(client, text) {
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Fă rezumate clare, concise, pe puncte." },
      { role: "user", content: text }
    ],
    max_tokens: 400,
    temperature: 0.3
  });

  return response.choices[0].message.content.trim();
}

/* ----------------- DETECTARE AI ----------------- */
async function detectAI(client, text) {
  const response = await client.chat.completions.create({
    model: "llama-3.1-70b-versatile",
    messages: [
      {
        role: "system",
        content: `
Ești un detector AI. Analizezi dacă textul pare generat artificial.

Returnează STRICT un JSON ca acesta:
{
  "ai_probability": 0-100,
  "explanation": "text scurt"
}
`
      },
      { role: "user", content: text }
    ],
    max_tokens: 300,
    temperature: 0.2
  });

  let content = response.choices[0].message.content.trim();

  try {
    return JSON.parse(content);
  } catch {
    return {
      ai_probability: 50,
      explanation: "Nu am putut interpreta răspunsul modelului."
    };
  }
}
