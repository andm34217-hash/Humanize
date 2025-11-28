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
          result: await summarizeText(client, te
