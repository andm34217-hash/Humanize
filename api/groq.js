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
        return res.status(200).json({ result: await rewriteSafe(client, text) });

      case "summary":
        return res.status(200).json({ result: await summary(client, text) });

      case "extend":
        return res.status(200).json({ result: await extendText(client, text) });

      case "simplify":
        return res.status(200).json({ result: await simplifyText(client, text) });

      case "detect":
        return res.status(200).json({ result: await detectAI(client, text) });

      case "math_solver":
        return res.status(200).json({ result: await mathSolve(client, text) });

      default:
        return res.status(400).json({ error: "Invalid mode" });
    }

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}

/* -------------------------------------------------------- */
/* ------------ RESCRIE AUTOMAT SUB 25% AI ---------------- */
/* -------------------------------------------------------- */

async function rewriteSafe(client, text) {
  let rewritten = text;
  let score = 100;

  for (let i = 0; i < 3; i++) {

    const r = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "Rescrie textul într-un stil natural, colocvial, ușor imperfect. Evită structurile de AI, schimbă ritmul și lungimea frazelor."
        },
        { role: "user", content: text }
      ],
      temperature: 0.8
    });

    rewritten = r.choices[0].message.content.trim();

    const detect = await detectAI(client, rewritten);
    score = detect.ai_probability;

    if (score <= 25) break;
  }

  return { rewritten, ai_probability: score };
}

/* -------------------------------------------------------- */
/* ---------------------- EXTINDE -------------------------- */
/* -------------------------------------------------------- */
async function extendText(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "Extinde textul păstrând sensul, adaugă explicații naturale, exemple, clarificări. Nu folosi ton academic."
      },
      { role: "user", content: text }
    ],
    temperature: 0.7
  });

  return r.choices[0].message.content.trim();
}

/* -------------------------------------------------------- */
/* --------------------- SIMPLIFICĂ ------------------------ */
/* -------------------------------------------------------- */
async function simplifyText(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "Simplifică textul astfel încât să fie ușor de înțeles de un elev de liceu. Fără termeni complicați."
      },
      { role: "user", content: text }
    ],
    temperature: 0.4
  });

  return r.choices[0].message.content.trim();
}

/* -------------------------------------------------------- */
/* ------------------- DETECTARE AI ------------------------ */
/* -------------------------------------------------------- */
async function detectAI(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          `Returnează STRICT acest JSON:
{
  "ai_probability": number,
  "explanation": "scurt"
}`
      },
      { role: "user", content: text }
    ],
    temperature: 0.2
  });

  try {
    return JSON.parse(r.choices[0].message.content.trim());
  } catch {
    return { ai_probability: 55, explanation: "Nu am putut analiza" };
  }
}

/* -------------------------------------------------------- */
/* ------------ CALCULATOR MATEMATIC ---------------------- */
/* -------------------------------------------------------- */
async function mathSolve(client, text) {
  const r = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "Rezolvă pas cu pas problema matematică. Returnează într-un format clar: problemă, pași, explicații, rezultat final."
      },
      { role: "user", content: text }
    ],
    temperature: 0.2
  });

  return r.choices[0].message.content.trim();
}
