document.addEventListener("DOMContentLoaded", () => {

  /* THEME */
  const html = document.documentElement;
  const toggleTheme = document.getElementById("toggleTheme");
  function applyTheme(theme){ if(theme==="dark"){ html.classList.add("dark"); localStorage.setItem("theme","dark")} else { html.classList.remove("dark"); localStorage.setItem("theme","light") } }
  applyTheme(localStorage.getItem("theme") || "light");
  if (toggleTheme) toggleTheme.onclick = ()=> applyTheme(html.classList.contains("dark") ? "light" : "dark");

  /* ELEMENTS */
  const input = document.getElementById("inputText");
  const output = document.getElementById("outputText");
  const bullets = document.getElementById("bullets");
  const btnRewrite = document.getElementById("btnRewrite");
  const btnSummary = document.getElementById("btnSummary");
  const btnDetect = document.getElementById("btnDetect");
  const btnClear = document.getElementById("btnClear");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const progressFill = document.getElementById("progressFill");
  const scorePct = document.getElementById("scorePct");
  const menuBtns = document.querySelectorAll(".menu-btn");

  function setScore(p){ p = Math.max(0, Math.min(100, Math.round(p))); progressFill.style.width = p + "%"; scorePct.textContent = p + "%"; }

  async function apiCall(path, body){
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || JSON.stringify(json));
    return json.result;
  }

  async function callGroq(mode, text){ return apiCall("/api/groq", { mode, text }); }
  async function callStudent(mode, text, options){ return apiCall("/api/student", { mode, text, options }); }
  async function callMath(problem){ return apiCall("/api/math", { problem }); }

  /* REWRITE - AI SAFE loop */
  btnRewrite.onclick = async () => {
    if (!input.value.trim()) return alert("Introdu text!");
    output.value = "Se rescrie...";
    try {
      let text = input.value.trim();
      let aiScore = 100;
      let finalText = text;
      for (let i = 0; i < 5; i++) {
        const rewritten = await callGroq("rewrite", text);
        // rewritten may be string or object depending on API - accept string
        const rewrittenText = typeof rewritten === "string" ? rewritten : (rewritten.result || JSON.stringify(rewritten));
        const detection = await callGroq("detect", rewrittenText);
        aiScore = detection.ai_probability ?? 50;
        finalText = rewrittenText;
        output.value = `Încercare ${i+1}/5 — scor AI: ${aiScore}%`;
        if (aiScore <= 25) break;
        text = rewrittenText;
      }
      output.value = finalText;
      setScore(aiScore);
    } catch (e) {
      output.value = "Eroare: " + e.message;
    }
  };

  /* SUMMARY */
  btnSummary.onclick = async () => {
    if (!input.value.trim()) return alert("Introdu text!");
    bullets.innerHTML = "Se generează...";
    try {
      const r = await callGroq("summary", input.value.trim());
      const text = typeof r === "string" ? r : (r.result || JSON.stringify(r));
      bullets.innerHTML = "<ul>" + text.split(/\n+/).filter(Boolean).map(l => `<li>${l}</li>`).join("") + "</ul>";
    } catch (e) {
      bullets.innerHTML = "Eroare la rezumat.";
    }
  };

  /* DETECT */
  btnDetect.onclick = async () => {
    if (!input.value.trim()) return alert("Introdu text!");
    output.value = "Se detectează AI...";
    try {
      const r = await callGroq("detect", input.value.trim());
      const pct = r.ai_probability ?? (r?.result?.ai_probability) ?? 50;
      const explanation = r.explanation || r?.result?.explanation || JSON.stringify(r);
      setScore(pct);
      output.value = "Explicație detectare AI:\n\n" + explanation;
    } catch (e) {
      output.value = "Eroare: " + e.message;
      setScore(0);
    }
  };

  /* CLEAR */
  btnClear.onclick = () => { input.value = ""; output.value = ""; bullets.innerHTML = "—"; setScore(0); };

  /* COPY / DOWNLOAD */
  copyBtn.onclick = async () => { await navigator.clipboard.writeText(output.value || ""); copyBtn.textContent = "Copiat!"; setTimeout(()=>copyBtn.textContent = "Copiază", 1200); };
  downloadBtn.onclick = () => { const blob = new Blob([output.value || ""], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "rezultat.txt"; a.click(); URL.revokeObjectURL(url); };

  /* MENU BUTTONS */
  menuBtns.forEach(btn => btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "rewrite") btnRewrite.click();
    if (action === "summary") btnSummary.click();
    if (action === "detect") btnDetect.click();
    if (action === "essay") {
      const text = input.value.trim() || prompt("Despre ce vrei eseul?");
      if (!text) return;
      callStudent("essay", text, { tone: "academic" }).then(r => output.value = typeof r === "string" ? r : (r.result || JSON.stringify(r))).catch(e => output.value = "Eroare: " + e.message);
    }
    if (action === "explain") {
      const text = input.value.trim() || prompt("Ce vrei explicat?");
      if (!text) return;
      callStudent("explain", text, { level: "student" }).then(r => output.value = typeof r === "string" ? r : (r.result || JSON.stringify(r))).catch(e => output.value = "Eroare: " + e.message);
    }
    if (action === "translate") {
      const text = input.value.trim() || prompt("Text de tradus?");
      if (!text) return;
      callStudent("translate", text, { to: "en" }).then(r => output.value = typeof r === "string" ? r : (r.result || JSON.stringify(r))).catch(e => output.value = "Eroare: " + e.message);
    }
  }));

  /* MATH */
  const btnMathToggle = document.getElementById("btnMathToggle");
  const mathPanel = document.getElementById("mathPanel");
  const solveMath = document.getElementById("solveMath");
  const mathInput = document.getElementById("mathInput");
  const mathResult = document.getElementById("mathResult");
  const copyMath = document.getElementById("copyMath");

  if (btnMathToggle) btnMathToggle.onclick = () => mathPanel.classList.toggle("hidden");

  function renderMathResult(result) {
    mathResult.innerHTML = "";
    const header = document.createElement("div"); header.innerHTML = `<strong>Problem:</strong> ${escapeHtml(result.problem || "")}`; mathResult.appendChild(header);

    (result.steps || []).forEach((s, i) => {
      const div = document.createElement("div"); div.className = "math-step";
      div.innerHTML = `<strong>Pas ${i+1}: ${escapeHtml(s.step || "")}</strong><div>${escapeHtml(s.explanation || "")}</div>`;
      if (s.latex) { const ld = document.createElement("div"); ld.className = "math-latex"; ld.innerHTML = `$$${s.latex}$$`; div.appendChild(ld); }
      mathResult.appendChild(div);
    });

    const fa = document.createElement("div");
    fa.innerHTML = `<strong>Răspuns final:</strong> ${escapeHtml(result.final_answer?.text || "")}`;
    if (result.final_answer?.latex) { const l = document.createElement("div"); l.innerHTML = `$$${result.final_answer.latex}$$`; fa.appendChild(l); }
    mathResult.appendChild(fa);

    if (window.renderMathInElement) {
      try { renderMathInElement(mathResult, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }); }
      catch (e) { console.warn("KaTeX render error:", e); }
    }
  }

  solveMath.onclick = async () => {
    const problem = mathInput.value.trim(); if (!problem) return alert("Scrie problema.");
    mathResult.innerHTML = "Se calculează...";
    try {
      const r = await callMath(problem);
      // r may be { result: {...} } or object; adapt
      const resObj = (r && r.problem) ? r : (r.result ? r.result : (typeof r === "string" ? tryParseJSON(r) : r));
      if (!resObj) { mathResult.innerHTML = "Eroare: răspuns invalid"; return; }
      renderMathResult(resObj);
    } catch (e) {
      mathResult.innerHTML = "Eroare: " + e.message;
    }
  };

  copyMath.onclick = () => { navigator.clipboard.writeText(mathResult.innerText || ""); copyMath.textContent = "Copiat!"; setTimeout(() => copyMath.textContent = "Copiază rezultat", 1000); };

  /* HELPERS */
  function escapeHtml(s = "") { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function tryParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }

});
