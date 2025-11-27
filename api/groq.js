import Groq from "groq-sdk";

// =====================================================================
//   GROQ CLIENT SETUP
// =====================================================================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================================================
//   REWRITE FUNCTION (rescriere inteligentă + humanizare)
// =====================================================================
async function rewriteText(text) {
  const prompt = `
Rescrie următorul text într-un stil uman, natural, fără cuvinte pompoase,
fără fraze lungi, fără ton exagerat. Să pară scris de un student normal.

Text:
${text}

Rescriere:
`;

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",   // MODEL ACTIV ȘI RAPID
    messages: [
      { role: "system", content: "Ești un asistent care rescrie text în mod natural și uman." },
      { role: "user", content: prompt }
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices?.[0]?.message?.content?.trim();
}

// =====================================================================
//   SUMMARY FUNCTION (rezumat pe puncte)
// =====================================================================
async function summarizeText(text) {
  const prompt = `
Fă un rezumat pe puncte, foarte clar și simplu, al următorului text:

${text}

Rezumat:
`;

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "Faci rezumate în stil simplu, pe puncte." },
      { role: "user", content: prompt }
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  return response.choices?.[0]?.message?.content?.trim();
}

// =====================================================================
//   MAIN API HANDLER
// =====================================================================
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, mode } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text input" });
    }

    let result;

    if (mode === "rewrite") {
      result = await rewriteText(text);
    } else if (mode === "summary") {
      result = await summarizeText(text);
    } else {
      return res.status(400).json({ error: "Invalid mode" });
    }

    res.status(200).json({ result });

  } catch (err) {
    console.error("GROQ ERROR:", err.response?.data || err.message);
    res.status(500).json({
      error: "Groq API returned an invalid response",
      details: err.response?.data || err.message
    });
  }
}
