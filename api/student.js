// api/student.js
export const config = { runtime: "nodejs" };
import Groq from "groq-sdk";
const MODEL = "openai/gpt-oss-20b"; // cont tău

export default async function handler(req,res){
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });
  try{
    const { mode, text, options } = req.body;
    if (!mode || !text) return res.status(400).json({ error:"Missing mode or text" });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error:"Missing GROQ_API_KEY" });

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (mode === "essay") {
      // generate essay with structure
      const prompt = `Generate an essay (intro, 3 body paragraphs, conclusion) about:\n${text}\nTone: ${options?.tone||"academic"}`;
      const r = await client.chat.completions.create({ model: MODEL, messages:[{role:"user", content:prompt}], max_tokens:900 });
      return res.status(200).json({ result: r.choices[0].message.content });
    }

    if (mode === "explain") {
      const level = options?.level || "student";
      const prompt = `Explain the following concept at level: ${level}\n\n${text}`;
      const r = await client.chat.completions.create({ model: MODEL, messages:[{role:"user", content:prompt}], max_tokens:500 });
      return res.status(200).json({ result: r.choices[0].message.content });
    }

    if (mode === "translate") {
      const target = options?.to || "en";
      const prompt = `Translate to ${target} the following, keep academic tone if options.academic:true:\n${text}`;
      const r = await client.chat.completions.create({ model: MODEL, messages:[{role:"user", content:prompt}], max_tokens:600 });
      return res.status(200).json({ result: r.choices[0].message.content });
    }

    if (mode === "code") {
      const task = options?.task || "explain";
      const prompt = `You are a coding assistant. ${task}:\n${text}`;
      const r = await client.chat.completions.create({ model: MODEL, messages:[{role:"user", content:prompt}], max_tokens:900 });
      return res.status(200).json({ result: r.choices[0].message.content });
    }

    if (mode === "quiz") {
      const prompt = `Create a ${options?.count||10}-question multiple choice quiz from the text below. Provide answers and short explanations. Text:\n${text}`;
      const r = await client.chat.completions.create({ model: MODEL, messages:[{role:"user", content:prompt}], max_tokens:900 });
      return res.status(200).json({ result: r.choices[0].message.content });
    }

    return res.status(400).json({ error:"Unknown mode" });

  } catch(err){
    console.error("STUDENT ERROR:",err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
