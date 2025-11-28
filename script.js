
/* ===========================
   THEME SYSTEM
=========================== */
const html = document.documentElement;
const toggleTheme = document.getElementById("toggleTheme");

function applyTheme(theme) {
  if (theme === "dark") {
    html.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    html.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

// Load saved theme
applyTheme(localStorage.getItem("theme") || "light");

// Toggle theme
toggleTheme.onclick = () => {
  const newTheme = html.classList.contains("dark") ? "light" : "dark";
  applyTheme(newTheme);
};

document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("inputText");
  const output = document.getElementById("outputText");
  const bullets = document.getElementById("bullets");

  const btnDetect = document.getElementById("btnDetect");
  const btnRewrite = document.getElementById("btnRewrite");
  const btnSummary = document.getElementById("btnSummary");
  const btnClear = document.getElementById("btnClear");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const progressFill = document.getElementById("progressFill");
  const scorePct = document.getElementById("scorePct");

  function setScore(pct) {
    pct = Math.max(0, Math.min(100, pct));
    progressFill.style.width = pct + "%";
    scorePct.textContent = pct + "%";
  }

  async function callGroq(mode, text) {
    const r = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    return data.result;
  }

  btnRewrite.onclick = async () => {
    if (!input.value.trim()) return alert("Introdu text!");
    output.value = "Se rescrie...";
    try {
      const r = await callGroq("rewrite", input.value.trim());
      output.value = r;
    } catch (e) { output.value = "Eroare: " + e.message; }
  };

  btnSummary.onclick = async () => {
    if (!input.value.trim()) return alert("Introdu text!");
    bullets.innerHTML = "Se generează rezumat...";
    try {
      const r = await callGroq("summary", input.value.trim());
      bullets.innerHTML =
        "<ul>" +
        r.split("\n").filter(x => x.trim()).map(x => `<li>${x}</li>`).join("") +
        "</ul>";
    } catch (e) { bullets.innerHTML = "Eroare la rezumat."; }
  };

  btnDetect.onclick = async () => {
    if (!input.value.trim()) return alert("Introdu text!");
    output.value = "Se detectează AI...";
    try {
      const r = await callGroq("detect", input.value.trim());
      setScore(r.ai_probability);
      output.value = "Explicație detectare AI:\n\n" + r.explanation;
    } catch (e) {
      output.value = "Eroare: " + e.message;
      setScore(0);
    }
  };

  btnClear.onclick = () => {
    input.value = "";
    output.value = "";
    bullets.innerHTML = "Nu există rezumat.";
    setScore(0);
  };

  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(output.value);
    copyBtn.textContent = "Copiat!";
    setTimeout(() => copyBtn.textContent = "Copiază", 1500);
  };

  downloadBtn.onclick = () => {
    const blob = new Blob([output.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rezultat.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // MENIU LATERAL - conectare
  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action;
      if (action === "rewrite") btnRewrite.click();
      if (action === "summary") btnSummary.click();
      if (action === "detect") btnDetect.click();
    };
  });

});

