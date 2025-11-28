// Forțăm Node runtime pe Vercel (evităm Edge runtime care nu suportă groq-sdk)
export const config = {
  runtime: "nodejs"
};

import Groq from "groq-sdk";

/**
 * API endpoint: POST /api/groq
 * body: { text: string, mode: "rewrite" | "summary" }
 * Requires env var: GROQ_API_KEY
 */

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

    // Model valid (actual, 2025)
    const MODEL = "llama-3.1-8b-instant";

    let result;
    if (mode === "rewrite") {
      result = await rewriteText(client, text, MODEL);
    } else if (mode === "summary") {
      result = await summarizeText(client, text, MODEL);
    } else {
      return res.status(400).json({ error: "Invalid mode" });
    }

    return res.status(200).json({ result });
  } catch (err) {
    console.error("GROQ ERROR:", err);
    // try to reveal useful message but avoid leaking secrets
    const message = err?.response?.data || err?.message || "Server error";
    return res.status(500).json({ error: String(message) });
  }
}

async function rewriteText(client, text, model) {
  const prompt = `Rescrie textul următor într-un stil natural, clar și uman. Păstrează sensul, scurtează frazele greoaie. Text:\n\n${text}\n\nRescriere:\n`;
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Rescrie textul într-un mod natural, concis și uman." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 800
  });

  return response.choices?.[0]?.message?.content?.trim() || "Eroare: răspuns invalid.";
}

async function summarizeText(client, text, model) {
  const prompt = `Fă un rezumat pe puncte, clar și simplu pentru următorul text:\n\n${text}\n\nRezumat:\n`;
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Fă rezumate clare, pe puncte." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 400
  });

  return response.choices?.[0]?.message?.content?.trim() || "Eroare: răspuns invalid.";
}
