// api/math.js
export const config = { runtime: "nodejs" };
import Groq from "groq-sdk";
const MODEL = "openai/gpt-oss-20b";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { problem } = req.body;
    if (!problem) return res.status(400).json({ error: "Missing problem" });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "Missing GROQ_API_KEY" });

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const system = `
You are a step-by-step math tutor. Return STRICT JSON:
{
 "problem":"...", 
 "steps":[{"step":"title","explanation":"...","latex":"..."}], 
 "final_answer":{"text":"...","latex":"..."},
 "notes":"..."
}`;
    const user = `Problem:\n${problem}\n\nReturn JSON only.`;
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [{role:"system", content: system},{role:"user", content: user}],
      temperature: 0.0,
      max_tokens: 900
    });

    const raw = r.choices[0].message.content.trim();
    try {
      const parsed = JSON.parse(raw);
      return res.status(200).json({ result: parsed });
    } catch (e) {
      return res.status(200).json({ result: { problem, steps:[{step:"raw", explanation:raw}], final_answer:{text:"N/A"} } });
    }
  } catch (err) {
    console.error("MATH ERROR:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
