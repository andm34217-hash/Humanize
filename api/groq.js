// Force Node runtime on Vercel
export const config = { runtime: "nodejs" };

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

    switch (mode) {

      case "rewrite":
        return res.status(200).json({
          result: await rewriteText(client, text)
        });

      case "summary":
        return res.status(200).json({
          result: await summarizeText(client, text)
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

/* --------------------------------------------
   MODEL UNIC DISPONIBIL ÎN CONTUL TĂU GROQ
-------------------------------------------- */
const MODEL = "openai/gpt-oss-20b";

/* ----------------- RESCRIE ----------------- */
async function rewriteText(client, text) {
  const prompt = `
Rescrie textul următor într-un mod 100% uman, natural și sub 25% probabilitate AI.
Păstrează sensul, claritatea și tonul conversațional.

Text original:
${text}

Rescriere optimizată (umanizată):
`;

  const r = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Rescriere umană, naturală, sub 25% AI probability." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 800
  });

  return r.choices[0].message.content.trim();
}

/* ----------------- REZUMAT ----------------- */
async function summarizeText(client, text) {
  const prompt = `
Creează un rezumat scurt, clar, pe puncte, al textului următor:

${text}

Rezumat:
`;

  const r = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Fă rezumate clare și concise." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 400
  });

  return r.choices[0].message.content.trim();
}

/* ----------------- DETECTARE AI ----------------- */
async function detectAI(client, text) {
  const prompt = `
Analizează textul și întoarce STRICT un JSON valid:

{
  "ai_probability": number intre 0 și 100,
  "explanation": "explicatie scurtă"
}

Text:
${text}

JSON:
`;

  const r = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "Evaluează probabilitatea ca textul să fie generat de AI." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 200
  });

  const raw = r.choices[0].message.content.trim();

  try {
    const parsed = JSON.parse(raw);

    return {
      ai_probability: Math.max(0, Math.min(100, parsed.ai_probability)),
      explanation: parsed.explanation || "Fără explicație."
    };

  } catch (e) {
    return {
      ai_probability: 50,
      explanation: "Răspunsul nu a fost JSON, dar modelul a returnat text brut."
    };
  }
}
