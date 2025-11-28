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

  // ============================
  // UTILITATI
  // ============================

  function setScore(pct) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    progressFill.style.width = pct + "%";
    scorePct.textContent = pct + "%";
  }

  function showError(msg) {
    output.value = "Eroare: " + msg;
  }

  async function callGroq(mode, text) {
    const r = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode }),
    });

    const data = await r.json();

    if (!r.ok) {
      throw new Error(data.error || "Eroare server.");
    }

    return data;
  }

  // ============================
  // RESCRIE
  // ============================
  btnRewrite.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return alert("Introdu textul!");

    output.value = "Se rescrie...";

    try {
      const res = await callGroq("rewrite", text);
      output.value = res.result;

      if (autoSummary.checked) {
        await doSummary(output.value);
      }
    } catch (e) {
      showError(e.message);
    }
  });

  // ============================
  // SUMARIZARE
  // ============================
  async function doSummary(text) {
    if (!text) return;

    bullets.innerHTML = "Se generează rezumat...";

    try {
      const res = await callGroq("summary", text);
      const lines = res.result.split(/\n+/).filter(Boolean);

      const max = shortBullets.checked ? 6 : 12;

      bullets.innerHTML =
        "<ul>" + lines.slice(0, max).map(l => `<li>${l}</li>`).join("") + "</ul>";
    } catch (e) {
      bullets.innerHTML = "Eroare la rezumat.";
    }
  }

  document.querySelector("[data-action='summary']").addEventListener("click", async () => {
    await doSummary(input.value.trim() || output.value.trim());
  });

  // ============================
  // DETECTARE AI (dummy simplificat)
  // ============================
  btnDetect.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    output.value = "Se analizează textul...";
    setScore(50);

    // Dacă dorești să implementezi detectare reală, trebuie alt backend.
    output.value = "Detectarea AI nu este implementată încă.";
  });

  // ============================
  // APLICĂ TOT (RESCRIE + REZUMĂ)
  // ============================
  applyAll.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return alert("Introdu textul!");

    btnRewrite.click();

    setTimeout(async () => {
      await doSummary(output.value);
    }, 500);
  });

  // ============================
  // CLEAR
  // ============================
  btnClear.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    bullets.innerHTML = "Nu s-a găsit rezumat.";
    setScore(0);
  });

  // ============================
  // COPIERE
  // ============================
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(output.value || input.value);
    copyBtn.textContent = "Copiat!";
    setTimeout(() => (copyBtn.textContent = "Copiază"), 1200);
  });

  // ============================
  // DOWNLOAD TXT
  // ============================
  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([output.value || input.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "rezultat.txt";
    a.click();

    URL.revokeObjectURL(url);
  });

  // ============================
  // EXPORT PDF
  // ============================
  exportPdf.addEventListener("click", () => {
    const w = window.open("", "_blank");
    w.document.write(`
      <h2>Rezultat</h2>
      <pre>${output.value}</pre>
      <h2>Rezumat</h2>
      ${bullets.innerHTML}
    `);
    w.document.close();
    w.print();
  });

  // ============================
  // PLANURI
  // ============================
  btnPlans.addEventListener("click", () => {
    alert("Planurile premium vor fi disponibile în curând.");
  });
});
