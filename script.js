// ==========================
// SELECTORI IMPORTANȚI
// ==========================
const input = document.getElementById("inputText");
const output = document.getElementById("outputText");
const bullets = document.getElementById("bullets");
const scorePct = document.getElementById("scorePct");
const progressFill = document.getElementById("progressFill");

// butoane top
const btnDetect = document.getElementById("btnDetect");
const btnRewrite = document.getElementById("btnRewrite");
const btnClear = document.getElementById("btnClear");
const btnRewriteAndSummary = document.getElementById("applyAll");

// butoane din sidebar
document.querySelectorAll(".menu-btn").forEach(btn => {
  btn.addEventListener("click", () => handleSidebar(btn.dataset.action));
});

// tema
document.getElementById("toggleTheme").addEventListener("click", toggleTheme);


// ==========================
// FUNCȚIE UNIVERSALĂ API
// ==========================
async function callGroq(mode, text) {
  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, text })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Eroare necunoscută");

  return data;
}


// ==========================
// FUNCTII: SCOR AI
// ==========================
function setScore(val) {
  const pct = Math.round(val);
  scorePct.textContent = pct + "%";
  progressFill.style.width = pct + "%";
}


// ==========================
// SIDEBAR ACTIONS
// ==========================
async function handleSidebar(action) {
  const text = input.value.trim();
  if (!text) return alert("Introdu text.");

  if (action === "detect") return runDetect();
  if (action === "rewrite") return runRewrite();
  if (action === "summary") return runSummary();
  if (action === "simplify") return runSimplify();
  if (action === "extend") return runExtend();
}


// ==========================
// ACTIONS: DETECT, RESCRIE, REZUMĂ
// ==========================
async function runDetect() {
  const text = input.value.trim();
  output.value = "Analizez textul...";
  bullets.textContent = "—";

  try {
    const res = await callGroq("detect", text);

    output.value = res.result.explanation;
    setScore(res.result.ai_probability);

  } catch (err) {
    output.value = "Eroare: " + err.message;
    setScore(0);
  }
}

async function runRewrite() {
  const text = input.value.trim();
  output.value = "Rescriu textul...";

  try {
    const res = await callGroq("rewrite", text);
    output.value = res.result;

  } catch (err) {
    output.value = "Eroare: " + err.message;
  }
}

async function runSummary() {
  const text = input.value.trim();
  bullets.textContent = "Generez rezumatul...";

  try {
    const res = await callGroq("summary", text);
    bullets.innerHTML = res.result.replace(/\n/g, "<br>");

  } catch (err) {
    bullets.textContent = "Eroare: " + err.message;
  }
}

async function runSimplify() {
  const text = input.value.trim();
  try {
    const res = await callGroq("simplify", text);
    output.value = res.result;

  } catch (err) {
    output.value = "Eroare: " + err.message;
  }
}

async function runExtend() {
  const text = input.value.trim();
  try {
    const res = await callGroq("extend", text);
    output.value = res.result;

  } catch (err) {
    output.value = "Eroare: " + err.message;
  }
}


// ==========================
// RESCRIE + REZUMĂ
// ==========================
btnRewriteAndSummary.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) return alert("Introdu text.");

  output.value = "Procesez textul...";

  try {
    const rewritten = await callGroq("rewrite", text);
    const summary = await callGroq("summary", rewritten.result);

    output.value = rewritten.result;
    bullets.innerHTML = summary.result.replace(/\n/g, "<br>");

  } catch (err) {
    output.value = "Eroare: " + err.message;
  }
});


// ==========================
// BUTOANE SIMPLE
// ==========================
btnDetect.addEventListener("click", runDetect);
btnRewrite.addEventListener("click", runRewrite);
btnClear.addEventListener("click", () => {
  input.value = "";
  output.value = "";
  bullets.textContent = "—";
  setScore(0);
});


// ==========================
// TEMA LIGHT / DARK
// ==========================
function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark"));
}

// la încărcare
if (localStorage.getItem("theme") === "true") {
  document.body.classList.add("dark");
}
