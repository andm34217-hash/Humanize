export const config = { runtime: "nodejs" };

import Groq from "groq-sdk";

// /api/groq – endpoint unic pentru rewrite / summary / detect
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

    if (mode === "rewrite") return ok(res, await rewriteText(client, text));
    if (mode === "summary") return ok(res, await summaryText(client, text));
    if (mode === "detect") return ok(res, await detectAI(client, text));

    // funcțiile neimplementate
    if (mode === "simplify")
      return res.status(400).json({ error: "Funcția «Simplifică» nu este disponibilă." });

    if (mode === "extend")
      return res.status(400).json({ error: "Funcția «Extinde» nu este disponibilă." });

    return res.status(400).json({ error: "Invalid mode" });

  } catch (err) {
    console.error("GROQ ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}

function ok(res, result) {
  return res.status(200).json({ result });
}

/* -------- RESCRIE -------- */
async function rewriteText(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.3-8b-instant",
    messages: [
      { role: "system", content: "Rescrie textul natural, clar și uman." },
      { role: "user", content: text }
    ],
    temperature: 0.7
  });
  return r.choices[0].message.content.trim();
}

/* -------- REZUMAT -------- */
async function summaryText(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.3-8b-instant",
    messages: [
      { role: "system", content: "Generează un rezumat clar, pe puncte." },
      { role: "user", content: text }
    ],
    temperature: 0.2,
    max_tokens: 400
  });
  return r.choices[0].message.content.trim();
}

/* -------- DETECTARE AI -------- */
async function detectAI(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `
Ești un detector AI. Analizezi textul și returnezi STRICT JSON:
{
  "ai_probability": 0-100,
  "explanation": "text scurt explicativ"
}`
      },
      { role: "user", content: text }
    ],
    temperature: 0.1,
    max_tokens: 300
  });

  const raw = r.choices[0].message.content.trim();

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
