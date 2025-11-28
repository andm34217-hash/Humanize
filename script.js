document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("inputText");
  const output = document.getElementById("outputText");
  const bullets = document.getElementById("bullets");

  const btnDetect = document.getElementById("btnDetect");
  const btnRewrite = document.getElementById("btnRewrite");
  const btnClear = document.getElementById("btnClear");
  const btnPlans = document.getElementById("btnPlans");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const exportPdf = document.getElementById("exportPdf");
  const applyAll = document.getElementById("applyAll");

  const autoSummary = document.getElementById("autoSummary");
  const shortBullets = document.getElementById("shortBullets");

  const progressFill = document.getElementById("progressFill");
  const scorePct = document.getElementById("scorePct");

  function setScore(pct) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    progressFill.style.width = pct + "%";
    // color: low = green, mid = yellow, high = red (higher = more likely AI)
    let color;
    if (pct < 40) color = "linear-gradient(90deg,#00c853,#66ffb3)"; // green
    else if (pct < 70) color = "linear-gradient(90deg,#ffd54f,#ffb86b)"; // yellow
    else color = "linear-gradient(90deg,#ff6b6b,#ff3b3b)"; // red
    progressFill.style.background = color;
    scorePct.textContent = pct + "%";
  }

  function showError(msg) {
    output.value = "Eroare: " + (msg?.message || msg || "Server/Network error");
  }

  async function callGroq(mode, text) {
    const r = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Eroare server.");
    return data;
  }

  // ---------- Rewrite ----------
  btnRewrite.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return alert("Introdu textul!");

    output.value = "Se rescrie...";
    try {
      const res = await callGroq("rewrite", text);
      output.value = res.result;
      if (autoSummary.checked) await doSummary(output.value);
    } catch (e) {
      showError(e.message ? e.message : e);
    }
  });

  // ---------- Summary ----------
  async function doSummary(text) {
    if (!text) return;
    bullets.innerHTML = "Se generează rezumat...";
    try {
      const res = await callGroq("summary", text);
      const lines = String(res.result).split(/\n+/).filter(Boolean);
      const max = shortBullets.checked ? 6 : 12;
      bullets.innerHTML = "<ul>" + lines.slice(0, max).map(l => `<li>${escapeHtml(l)}</li>`).join("") + "</ul>";
    } catch (e) {
      bullets.innerHTML = "Eroare la rezumat.";
    }
  }

  // ---------- Detect AI ----------
  btnDetect.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return alert("Introdu text pentru detectare.");

    output.value = "Se analizează textul...";
    try {
      const res = await callGroq("detect", text);
      const score = Number(res.result.ai_probability ?? 50);
      const explanation = String(res.result.explanation ?? "Fără explicație");
      output.value = "Rezultat detectare AI:\n\n" + explanation;
      setScore(score);
    } catch (err) {
      showError(err.message ? err.message : err);
      setScore(0);
    }
  });

  // ---------- Apply All (Rescrie + Rezumă) ----------
  applyAll.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return alert("Introdu textul!");
    output.value = "Se rescrie și se generează rezumat...";
    try {
      const rewritten = await callGroq("rewrite", text);
      const summary = await callGroq("summary", rewritten.result);
      output.value = rewritten.result;
      bullets.innerHTML = "<ul>" + String(summary.result).split(/\n+/).filter(Boolean).slice(0,12).map(l => `<li>${escapeHtml(l)}</li>`).join("") + "</ul>";
    } catch (e) {
      showError(e.message ? e.message : e);
    }
  });

  // ---------- Other buttons ----------
  btnClear.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    bullets.innerHTML = "Nu s-a găsit rezumat.";
    setScore(0);
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value || input.value);
      copyBtn.textContent = "Copiat!";
      setTimeout(() => copyBtn.textContent = "Copiază", 1200);
    } catch {
      alert("Nu pot copia.");
    }
  });

  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([output.value || input.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rezultat.txt"; a.click();
    URL.revokeObjectURL(url);
  });

  exportPdf.addEventListener("click", () => {
    const w = window.open("", "_blank");
    w.document.write(`<h2>Rezultat</h2><pre>${escapeHtml(output.value)}</pre><h2>Rezumat</h2>${bullets.innerHTML}`);
    w.document.close(); w.print();
  });

  btnPlans.addEventListener("click", () => alert("Planuri & Prețuri - demo (implementare viitoare)."));

  // menu buttons wiring
  document.querySelectorAll(".menu-btn").forEach(b => {
    b.addEventListener("click", (ev) => {
      const action = ev.currentTarget.dataset.action;
      if (action === "rewrite") btnRewrite.click();
      else if (action === "summary") doSummary(input.value.trim() || output.value.trim());
      else if (action === "detect") btnDetect.click();
      else if (action === "simplify") alert("Funcție 'Simplifică' – în curând.");
      else if (action === "extend") alert("Funcție 'Extinde' – în curând.");
    });
  });

  function escapeHtml(s="") {
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
});
