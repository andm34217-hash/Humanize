// Forțăm Node.js runtime pe Vercel
export const config = { runtime: "nodejs" };

import Groq from "groq-sdk";

// API: /api/groq
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, mode } = req.body;
    if (!text || !mode)
      return res.status(400).json({ error: "Missing text or mode" });

    if (!process.env.GROQ_API_KEY)
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (mode === "rewrite") return ok(res, await rewrite(client, text));
    if (mode === "summary") return ok(res, await summary(client, text));
    if (mode === "detect") return ok(res, await detectAI(client, text));

    // dezactivăm funcții neimplementate
    if (mode === "simplify") return res.status(400).json({ error: "Funcția 'Simplifică' nu este disponibilă." });
    if (mode === "extend") return res.status(400).json({ error: "Funcția 'Extinde' nu este disponibilă." });

    return res.status(400).json({ error: "Invalid mode" });

  } catch (err) {
    console.error("GROQ SERVER ERROR:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}

function ok(res, result) {
  return res.status(200).json({ result });
}

/* ============================
   RESCRIE (Rewrite)
============================ */
async function rewrite(client, text) {
  const response = await client.chat.completions.create({
    model: "llama-3.3-8b-instant",
    messages: [
      { role: "system", content: "Rescrie textul natural, clar și uman." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

/* ============================
   SUMMARY (Rezumat)
============================ */
async function summary(client, text) {
  const response = await client.chat.completions.create({
    model: "llama-3.3-8b-instant",
    messages: [
      { role: "system", content: "Generează un rezumat clar, pe puncte." },
      { role: "user", content: text }
    ],
    max_tokens: 400,
    temperature: 0.2
  });

  return response.choices[0].message.content.trim();
}

/* ============================
   DETECTARE AI REALĂ
============================ */
async function detectAI(client, text) {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `
Ești un detector AI. Analizezi textul pentru a estima probabilitatea să fie generat de AI.
Returnează STRICT un JSON:
{
  "ai_probability": number (0-100),
  "explanation": "scurt text explicativ"
}`
      },
      { role: "user", content: text }
    ],
    temperature: 0.1,
    max_tokens: 300
  });

  const raw = response.choices[0].message.content.trim();

  try {
    const json = JSON.parse(raw);
    return {
      ai_probability: Math.min(100, Math.max(0, Number(json.ai_probability))),
      explanation: json.explanation || "Fără explicație"
    };
  } catch {
    return {
      ai_probability: 50,
      explanation: raw
    };
  }
}
