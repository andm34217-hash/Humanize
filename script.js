const inputText = document.getElementById("inputText")
const outputText = document.getElementById("outputText")
const scoreBar = document.getElementById("scoreBar")
const scoreText = document.getElementById("scoreText")

document.getElementById("themeToggle").onclick = () =>
    document.body.classList.toggle("dark")

// ------------------ API CALL ------------------

async function callGroq(prompt) {
    try {
        const response = await fetch("/api/groq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        })
        const data = await response.json()
        return data.output
    } catch {
        return null
    }
}

async function callOllama(prompt) {
    try {
        const response = await fetch("/api/ollama", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        })
        const data = await response.json()
        return data.output
    } catch {
        return "Eroare: nici un model nu a răspuns."
    }
}

async function rewrite() {
    const text = inputText.value.trim()
    if (!text) return;

    const prompt = `
Rescrie următorul text într-un stil de student, clar, natural, fără vocabular avansat.
Evită structurile specifice AI.

Text: ${text}
    `;

    let result = await callGroq(prompt)
    if (!result) result = await callOllama(prompt)

    outputText.value = result
}

async function summarize() {
    const text = inputText.value.trim()
    if (!text) return;

    const prompt = `
Extrage cele mai importante 5 idei din textul de mai jos și listează-le clar, ca puncte.

Text: ${text}
    `;

    let result = await callGroq(prompt)
    if (!result) result = await callOllama(prompt)

    outputText.value = result
}

async function detectAI() {
    const text = inputText.value.trim()
    if (!text) return;

    // Fake scoring — poate fi înlocuit cu un model real
    const rand = Math.floor(Math.random() * 40) + 10  
    
    scoreBar.style.width = rand + "%"
    scoreText.textContent = rand + "%"
}

document.getElementById("rewriteBtn").onclick = rewrite
document.getElementById("summaryBtn").onclick = summarize
document.getElementById("aiScoreBtn").onclick = detectAI
