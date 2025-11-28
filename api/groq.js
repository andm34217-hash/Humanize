import Groq from "groq-sdk";

/**
 * API endpoint pentru rescriere + sumarizare
 * Folosește modelul NOU: llama-3.1-8b-instant
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode } = req.body;

    if (!text || !mode) {
      return res
        .status(400)
        .json({ error: "Missing text or mode in request body." });
    }

    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const MODEL = "llama-3.1-8b-instant"; // ✔ MODEL NOU, ACTIV

    let result;

    if (mode === "rewrite") {
      result = await rewriteText(client, text, MODEL);
    } else if (mode === "summary") {
      result = await summarizeText(client, text, MODEL);
    } else {
      return res.status(400).json({ error: "Invalid mode" });
    }

    return res.status(200).json({ result });

  } catch (error) {
    console.error("GROQ ERROR:", error);
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}

/* ----------------------------------------------------- */
/* ---------------------- RESCRIE ----------------------- */
/* ----------------------------------------------------- */

async function rewriteText(client, text, model) {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Rescrie textul într-un mod natural, coerent și uman." },
      { role: "user", content: text }
    ],
    temperature: 0.7,
    max_tokens: 800
  });

  return response.choices[0]?.message?.content || "Eroare: răspuns invalid.";
}

/* ----------------------------------------------------- */
/* ---------------------- SUMAR ------------------------- */
/* ----------------------------------------------------- */

async function summarizeText(client, text, model) {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "Fă un rezumat clar și concis în bullet points." },
      { role: "user", content: text }
    ],
    temperature: 0.3,
    max_tokens: 400
  });

  return response.choices[0]?.message?.content || "Eroare: răspuns invalid.";
}
