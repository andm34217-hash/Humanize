export default async function handler(req, res) {
    try {
        const { prompt } = req.body

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "user", content: prompt }
                ]
            })
        })

        const data = await response.json()

        res.status(200).json({
            output: data.choices[0].message.content
        })

    } catch (e) {
        res.status(500).json({ output: null })
    }
}
