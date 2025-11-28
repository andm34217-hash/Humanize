export const config = { runtime: "nodejs" };

import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, mode } = req.body;

    if (!text || !mode)
      return res.status(400).json({ error: "Missing text or mode" });

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    switch (mode) {
      case "rewrite":
        return res.status(200).json({
          result: await rewrite(client, text)
        });

      case "summary":
        return res.status(200).json({
          result: await summary(client, text)
        });

      case "detect":
        return res.status(200).json({
          result: await detectAI(client, text)
        });

      default:
        return res.status(400).json({ error: "Invalid mode" });
    }

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}

/* ----------------- RESCRIE ----------------- */
async function rewrite(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Rescrie textul natural, clar, uman." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  });

  return r.choices[0].message.content.trim();
}

/* ----------------- REZUMAT ----------------- */
async function summary(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Creează un rezumat clar, pe puncte." },
      { role: "user", content: text }
    ],
    max_tokens: 300,
    temperature: 0.2
  });

  return r.choices[0].message.content.trim();
}

/* ----------------- DETECTARE AI ----------------- */
async function detectAI(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Analizează textul și întoarce STRICT un JSON:
{
  "ai_probability": number 0-100,
  "explanation": "text scurt"
}`
      },
      { role: "user", content: text }
    ],
    temperature: 0.1
  });

  const raw = r.choices[0].message.content.trim();

  try {
    const parsed = JSON.parse(raw);
    return {
      ai_probability: Math.max(0, Math.min(100, parsed.ai_probability)),
      explanation: parsed.explanation || "Fără explicație."
    };
  } catch {
    return {
      ai_probability: 50,
      explanation: raw
    };
  }
}
