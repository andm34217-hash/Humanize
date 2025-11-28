// Elemente UI
const input = document.getElementById("inputText");
const output = document.getElementById("outputText");
const btnRewrite = document.getElementById("btnRewrite");
const btnSummary = document.getElementById("btnSummary");
const btnDetect = document.getElementById("btnDetect");
const scoreBar = document.getElementById("scoreBar");
const scoreLabel = document.getElementById("scoreLabel");
const btnClear = document.getElementById("btnClear");

// ======================= API CALL =========================

async function callGroq(mode, text) {
  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, text })
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Eroare necunoscută API");
  }

  return await res.json();
}

// ======================= SCORE BAR =========================

function setScore(value) {
  value = Math.max(0, Math.min(100, value)); // clamp
  scoreBar.style.width = value + "%";
  scoreLabel.textContent = value + "%";

  // culori în funcție de scor
  if (value < 35) scoreBar.style.background = "#2ecc71"; // verde: uman
  else if (value < 65) scoreBar.style.background = "#f1c40f"; // galben: mixt
  else scoreBar.style.background = "#e74c3c"; // roșu: AI
}

function showError(msg) {
  output.value = "Eroare:\n" + msg;
}

// RESET
btnClear.addEventListener("click", () => {
  input.value = "";
  output.value = "";
  setScore(0);
});

// ======================= RESCRIERE =========================

btnRewrite.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) return alert("Introdu text pentru rescriere.");

  output.value = "Se rescrie textul...";

  try {
    const res = await callGroq("rewrite", text);
    output.value = res.result;
  } catch (err) {
    showError(err.message);
  }
});

// ======================= REZUMAT =========================

btnSummary.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) return alert("Introdu text pentru rezumat.");

  output.value = "Se generează rezumatul...";

  try {
    const res = await callGroq("summary", text);
    output.value = res.result;
  } catch (err) {
    showError(err.message);
  }
});

// ======================= DETECTARE AI (REALĂ) =========================

btnDetect.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) return alert("Introdu text pentru detectare AI.");

  output.value = "Se analizează textul...";

  try {
    const res = await callGroq("detect", text);

    const score = res.result.ai_probability;
    const explanation = res.result.explanation;

    output.value = "Rezultat detectare AI:\n\n" + explanation;
    setScore(score);

  } catch (err) {
    showError(err.message);
    setScore(0);
  }
});

// ======================= MENIU STÂNGA =========================

document.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    const action = e.currentTarget.dataset.action;

    if (action === "rewrite") {
      btnRewrite.click();
    } 
    else if (action === "summary") {
      btnSummary.click();
    } 
    else if (action === "detect") {
      btnDetect.click();
    } 
    else if (action === "simplify") {
      alert("Funcția 'Simplifică' va fi adăugată curând.");
    } 
    else if (action === "extend") {
      alert("Funcția 'Extinde textul' va fi adăugată curând.");
    }
  });
});
