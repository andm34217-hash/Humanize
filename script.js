// script.js - Humanizer frontend
// Ghid: pune /api/groq pe server (serverless), optional /api/ollama pentru fallback local

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("inputText");
  const output = document.getElementById("outputText");
  const bullets = document.getElementById("bullets");
  const btnDetect = document.getElementById("btnDetect");
  const btnRewrite = document.getElementById("btnRewrite");
  const btnClear = document.getElementById("btnClear");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const exportPdf = document.getElementById("exportPdf");
  const applyAll = document.getElementById("applyAll");
  const useLocal = document.getElementById("useLocal");
  const autoSummary = document.getElementById("autoSummary");
  const progressFill = document.getElementById("progressFill");
  const scorePct = document.getElementById("scorePct");
  const localStatus = document.getElementById("localStatus");
  const toggleThemeBtn = document.getElementById("toggleTheme");
  const shortBullets = document.getElementById("shortBullets");

  // utils
  function setBusy(flag) {
    [btnDetect, btnRewrite, btnClear, copyBtn, downloadBtn, applyAll].forEach(b => {
      if (flag) b.setAttribute("disabled", "true"); else b.removeAttribute("disabled");
    });
  }
  function setScore(pct) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    progressFill.style.width = pct + "%";
    scorePct.textContent = pct + "%";
    // color change small logic
    progressFill.style.background = pct > 70 ? "linear-gradient(90deg,#ff5a5f,#ffb199)" :
                              pct > 40 ? "linear-gradient(90deg,#ffb199,#ffd27a)" :
                                         "linear-gradient(90deg,#5af07a,#60d39f)";
  }
  function showError(msg){
    output.value = "Eroare: " + msg;
  }

  // server call helper - chooses groq or local fallback
  async function callModel(mode, text) {
    const useLocalModel = useLocal.checked;
    const body = { mode, text };

    // if local fallback chosen, call /api/ollama (proxy) otherwise /api/groq
    const url = useLocalModel ? "/api/ollama" : "/api/groq";

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`${r.status} ${txt}`);
      }
      return await r.json();
    } catch (err) {
      // propagate
      throw err;
    }
  }

  async function handleDetect() {
    const text = input.value.trim();
    if (!text) { alert("Introdu textul mai întâi."); return; }
    setBusy(true);
    setScore(0);
    output.value = "";
    bullets.innerHTML = "Se procesează...";
    try {
      const res = await callModel("detect", text);
      // res expected: { score: number } or fallback { result: "..." }
      let score = 0;
      if (res && typeof res.score === "number") score = res.score;
      else if (res && res.result) {
        // try to parse number inside
        const m = res.result.match(/(\d{1,3})\s*%?/);
        if (m) score = Number(m[1]);
      } else score = 50;
      setScore(score);
      bullets.innerHTML = "Analiză finalizată.";
      output.value = `Scor detectare AI: ${score}%`;
    } catch (err) {
      console.error(err);
      showError("nu s-a putut detecta (server).");
    } finally {
      setBusy(false);
    }
  }

  async function handleRewrite() {
    const text = input.value.trim();
    if (!text) { alert("Introdu textul mai întâi."); return; }
    setBusy(true);
    output.value = "";
    bullets.innerHTML = "Se rescrie...";
    try {
      const res = await callModel("rewrite", text);
      const result = (res && res.result) ? res.result : (res && res.rewrite) ? res.rewrite : "";
      output.value = result || "No result";
      // auto-resume detection if set
      if (autoSummary.checked) {
        await handleSummary(); // show bullets
      }
    } catch (err) {
      console.error(err);
      showError("eroare la rescriere");
    } finally {
      setBusy(false);
    }
  }

  async function handleSummary() {
    const text = output.value.trim() || input.value.trim();
    if (!text) { bullets.innerHTML = "Nu este text."; return; }
    bullets.innerHTML = "Se generează rezumat...";
    try {
      const res = await callModel("summary", text);
      const raw = (res && res.result) ? res.result : res?.summary || "";
      const lines = String(raw).trim().split(/\n+/).filter(Boolean);
      // format bullets
      const maxLines = shortBullets && shortBullets.checked ? 6 : 10;
      const slice = lines.slice(0, maxLines);
      if (slice.length === 0) {
        // fallback: split sentences from text
        const s = text.split(/(?<=[.!?])\s+/).slice(0,6);
        bullets.innerHTML = "<ul>" + s.map(x => `<li>${escapeHtml(x)}</li>`).join("") + "</ul>";
      } else {
        bullets.innerHTML = "<ul>" + slice.map(x => `<li>${escapeHtml(x)}</li>`).join("") + "</ul>";
      }
    } catch (err) {
      console.error(err);
      bullets.innerHTML = "Eroare la rezumare.";
    }
  }

  // helper to escape HTML in bullets
  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  }

  // copy / download / export
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value || input.value);
      copyBtn.textContent = "Copiat!";
      setTimeout(()=>copyBtn.textContent="Copiază",1200);
    } catch {
      alert("Nu pot copia (clipboard).");
    }
  });

  downloadBtn.addEventListener("click", () => {
    const text = output.value || input.value;
    const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "humanized.txt"; a.click();
    URL.revokeObjectURL(url);
  });

  exportPdf.addEventListener("click", () => {
    // simple approach: open printable window
    const html = `
      <html><head><meta charset="utf-8"><title>Humanizer PDF</title></head>
      <body style="font-family:Arial;padding:20px;">
        <h2>Humanizer - Rezultat</h2>
        <h3>Text</h3>
        <pre>${escapeHtml(output.value || input.value)}</pre>
        <h3>Rezumat</h3>
        ${bullets.innerHTML}
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("Popup blocat. Permite ferestre noi pentru export PDF."); return; }
    w.document.open(); w.document.write(html); w.document.close();
    w.print();
  });

  // clear
  btnClear.addEventListener("click", () => {
    input.value = ""; output.value = ""; bullets.innerHTML = "Nu s-a găsit rezumat."; setScore(0);
  });

  // direct buttons
  btnDetect.addEventListener("click", handleDetect);
  btnRewrite.addEventListener("click", handleRewrite);

  // side menu quick actions
  document.querySelectorAll(".menu-btn").forEach(b => {
    b.addEventListener("click", async (ev) => {
      const a = ev.currentTarget.dataset.action;
      if (a === "detect") await handleDetect();
      else if (a === "rewrite") await handleRewrite();
      else if (a === "summary") await handleSummary();
      else {
        // use rewrite as default for other modes
        await handleRewrite();
      }
    });
  });

  // apply all: rewrite + summary
  applyAll.addEventListener("click", async () => {
    await handleRewrite();
    await handleSummary();
  });

  // Plans (simple demo action)
  document.getElementById("btnPlans").addEventListener("click", () => {
    alert("Planuri și prețuri: (demo) – adaugă modal de plată în backend.");
  });

  // toggle theme
  let dark = true;
  toggleThemeBtn.addEventListener("click", () => {
    dark = !dark;
    if (dark) {
      document.documentElement.style.setProperty('--bg','#0f1720');
    } else {
      document.documentElement.style.setProperty('--bg','#ffffff');
    }
    // small visual feedback
    toggleThemeBtn.textContent = dark ? "Light / Dark" : "Light / Dark";
  });

  // check local model status (optional check)
  async function checkLocal() {
    try {
      const r = await fetch("/api/ollama/status");
      if (r.ok) {
        const j = await r.json();
        localStatus.textContent = j.ok ? "conectat" : "deconectat";
      } else localStatus.textContent = "deconectat";
    } catch {
      localStatus.textContent = "deconectat";
    }
  }
  if (useLocal) {
    useLocal.addEventListener("change", checkLocal);
  }

  // initial UI
  setScore(0);
  bullets.innerHTML = "Introduceți/ lipiți textul și alegeți acțiunea.";
  checkLocal();
});
