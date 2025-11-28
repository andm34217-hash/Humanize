import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, mode } = req.body;

    if (!text || !mode) {
      return res.status(400).json({ error: "Missing input text or mode." });
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let modelName = "llama-3.1-8b-instant"; // ✔ model corect, activ

    let result;
    if (mode === "rewrite") {
      result = await rewriteText(client, text, modelName);
    } else if (mode === "summary") {
      result = await summarizeText(client, text, modelName);
    } else {
      return res.status(400).json({ error: "Invalid mode" });
    }

    return res.status(200).json({ result });
  } catch (error) {
    console.error("GROQ ERROR:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}

async function rewriteText(client, text, modelName) {
  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: "Rescrie textul într-un mod natural și uman." },
      { role: "user", content: text }
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "Eroare: răspuns invalid.";
}

async function summarizeText(client, text, modelName) {
  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: "Fă un rezumat scurt și clar." },
      { role: "user", content: text }
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || "Eroare: răspuns invalid.";
}
