// Forțăm Node runtime pe Vercel (groq-sdk nu rulează pe Edge)
export const config = { runtime: "nodejs" };

import Groq from "groq-sdk";

/**
 * POST /api/groq
 * body: { text: string, mode: "rewrite" | "summary" | "detect" }
 * env: GROQ_API_KEY
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, mode } = req.body;
    if (!text || !mode) return res.status(400).json({ error: "Missing text or mode" });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "Missing GROQ_API_KEY" });

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (mode === "rewrite") {
      const out = await rewriteText(client, text);
      return res.status(200).json({ result: out });
    }

    if (mode === "summary") {
      const out = await summarizeText(client, text);
      return res.status(200).json({ result: out });
    }

    if (mode === "detect") {
      const out = await detectAI(client, text);
      return res.status(200).json({ result: out });
    }

    return res.status(400).json({ error: "Invalid mode" });
  } catch (err) {
    console.error("GROQ ERROR:", err);
    const message = err?.response?.data || err?.message || "Server error";
    return res.status(500).json({ error: String(message) });
  }
}

/* ----------------- REWRITE ----------------- */
async function rewriteText(client, text) {
  const prompt = `Rescrie textul următor într-un stil natural, clar și uman. Păstrează sensul și clarifică frazele artiginale:\n\n${text}\n\nRescriere:\n`;
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Rescrie textul într-un mod natural, concis și uman." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 800
  });

  return response.choices?.[0]?.message?.content?.trim() || "Eroare: răspuns invalid.";
}

/* ----------------- SUMMARY ----------------- */
async function summarizeText(client, text) {
  const prompt = `Fă un rezumat pe puncte, clar și simplu pentru următorul text:\n\n${text}\n\nRezumat:\n`;
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Fă rezumate clare, concise, pe puncte." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 400
  });

  return response.choices?.[0]?.message?.content?.trim() || "Eroare: răspuns invalid.";
}

/* ----------------- DETECTARE AI ----------------- */
async function detectAI(client, text) {
  // folosim modelul mare pentru analiză mai bună
  const response = await client.chat.completions.create({
    model: "llama-3.1-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Ești un detector AI. Analizează textul și returnează un JSON EXACT cu două câmpuri:
{"ai_probability": number (0-100), "explanation": "scurt text explicativ"}`
      },
      { role: "user", content: text }
    ],
    temperature: 0.2,
    max_tokens: 300
  });

  const content = response.choices?.[0]?.message?.content?.trim() || "";

  // Încearcă să parsezi JSON direct. Dacă nu e JSON valid, extrage o valoare numerică heuristics.
  try {
    const parsed = JSON.parse(content);
    // Normalize fields
    const pct = Number(parsed.ai_probability ?? parsed.aiProbability ?? parsed.probability ?? 50);
    const explanation = String(parsed.explanation ?? parsed.note ?? parsed.reason ?? "Fără explicație");
    return { ai_probability: Math.max(0, Math.min(100, Math.round(pct))), explanation };
  } catch {
    // fallback: încercăm să găsim un număr în text
    const m = content.match(/(\d{1,3})(?:%| percent| pct|pts)?/i);
    const pct = m ? Math.max(0, Math.min(100, parseInt(m[1], 10))) : 50;
    return { ai_probability: pct, explanation: content.slice(0, 400) || "Nu am putut interpreta complet modelul." };
  }
}
