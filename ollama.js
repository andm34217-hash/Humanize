export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    const { prompt } = req.body

    try {
        // Trimite cererea către Ollama local
        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.1",
                messages: [
                    { role: "user", content: prompt }
                ]
            })
        })

        const data = await response.json()

        // Returnează OUTPUT-ul modelului
        return res.status(200).json({
            output: data.message?.content || "Eroare: răspuns gol de la Ollama."
        })

    } catch (error) {
        return res.status(500).json({
            error: "Nu s-a putut comunica cu Ollama.",
            details: error.message
        })
    }
}
