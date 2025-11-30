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

      case "rewrite_safe":
        return res.status(200).json({
          result: await rewriteSafe(client, text)
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

/* ================================================================== */
/* ----------------- RESCRIERE AUTOMATĂ SUB 25% --------------------- */
/* ================================================================== */

async function rewriteSafe(client, text) {
  let rewritten = text;
  let score = 100;

  for (let i = 0; i < 3; i++) {

    // 1) Rescriere naturală
    const r = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Rescrie textul într-un stil natural, ușor imperfect, cu expresii umane și variații reale. Evită tonul academic și propozițiile foarte corecte."
        },
        { role: "user", content: text }
      ],
      temperature: 0.8
    });

    rewritten = r.choices[0].message.content.trim();

    // 2) Detectare AI
    const detect = await detectAI(client, rewritten);
    score = detect.ai_probability;

    if (score <= 25) break; // STOP dacă e ok
  }

  return {
    rewritten,
    ai_probability: score
  };
}

/* ================================================================== */
/* ----------------------- DETECTARE AI ------------------------------ */
/* ================================================================== */

async function detectAI(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          `Analizează textul și returnează STRICT acest JSON:
{
  "ai_probability": number,
  "explanation": "text scurt"
}`
      },
      { role: "user", content: text }
    ],
    temperature: 0.2
  });

  let raw = r.choices[0].message.content.trim();

  try {
    return JSON.parse(raw);
  } catch {
    return { ai_probability: 50, explanation: "nu s-a putut analiza" };
  }
}
