// script.js - frontend logic (Light/Dark minimal + StudentHub controls + Math functions panel)
//
// Asigură-te că index.html conține elementele cu id-urile folosite aici:
// #toggleTheme, #inputText, #outputText, #bullets, #btnRewrite, #btnSummary, #btnDetect,
// #btnClear, #copyBtn, #downloadBtn, #btnMathToggle, #mathPanel, #mathInput, #solveMath,
// #mathResult, #copyMath, .menu-btn (cu data-action pentru essay/explain/translate).
//
// De asemenea KaTeX CDN trebuie inclus în HTML (vezi instrucțiunile anterioare).

document.addEventListener("DOMContentLoaded", () => {
  /* ---------------------------
     THEME: Light / Dark (minimal)
     --------------------------- */
  const html = document.documentElement;
  const themeToggle = document.getElementById("toggleTheme");

  function applyTheme(theme) {
    if (theme === "dark") {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      if (themeToggle) themeToggle.textContent = "☀️ Light";
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      if (themeToggle) themeToggle.textContent = "🌙 Dark";
    }
  }

  // initialize theme (default light)
  applyTheme(localStorage.getItem("theme") || "light");
  if (themeToggle) themeToggle.addEventListener("click", () => {
    applyTheme(html.classList.contains("dark") ? "light" : "dark");
  });

  /* ---------------------------
     ELEMENTS
     --------------------------- */
  const input = document.getElementById("inputText");
  const output = document.getElementById("outputText");
  const bullets = document.getElementById("bullets");

  const btnRewrite = document.getElementById("btnRewrite");
  const btnSummary = document.getElementById("btnSummary");
  const btnDetect = document.getElementById("btnDetect");
  const btnClear = document.getElementById("btnClear");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  // Math elements
  const btnMathToggle = document.getElementById("btnMathToggle");
  const mathPanel = document.getElementById("mathPanel");
  const mathInput = document.getElementById("mathInput");
  const solveMath = document.getElementById("solveMath");
  const mathResult = document.getElementById("mathResult");
  const copyMath = document.getElementById("copyMath");

  const menuBtns = document.querySelectorAll(".menu-btn");

  // progress / score UI (if exist)
  const progressFill = document.getElementById("progressFill");
  const scorePct = document.getElementById("scorePct");
  function setScore(p) {
    p = Math.max(0, Math.min(100, Math.round(p || 0)));
    if (progressFill) progressFill.style.width = p + "%";
    if (scorePct) scorePct.textContent = p + "%";
  }

  /* ---------------------------
     HELPERS: API call wrapper
     --------------------------- */
  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      // try to give useful message
      const message = json?.error || (json ? JSON.stringify(json) : res.statusText);
      throw new Error(message || `HTTP ${res.status}`);
    }
    return json?.result ?? json;
  }

  /* ---------------------------
     GROQ SHORTHAND CALLS
     --------------------------- */
  async function groqRewriteSafe(text) {
    return apiPost("/api/groq", { mode: "rewrite_safe", text });
  }
  async function groqSummary(text) {
    return apiPost("/api/groq", { mode: "summary", text });
  }
  async function groqExtend(text) {
    return apiPost("/api/groq", { mode: "extend", text });
  }
  async function groqSimplify(text) {
    return apiPost("/api/groq", { mode: "simplify", text });
  }
  async function groqDetect(text) {
    return apiPost("/api/groq", { mode: "detect", text });
  }
  async function groqMath(text) {
    return apiPost("/api/groq", { mode: "math_solver", text });
  }

  // student.js endpoints (if exist)
  async function studentCall(mode, text, options = {}) {
    return apiPost("/api/student", { mode, text, options });
  }

  /* ---------------------------
     REWRITE (AI-SAFE LOOP client-side)
     --------------------------- */
  if (btnRewrite) {
    btnRewrite.addEventListener("click", async () => {
      const text = (input?.value || "").trim();
      if (!text) return alert("Introdu textul pe care vrei să-l rescrii.");

      output.value = "Se rescrie... (proces în desfășurare)";
      setScore(0);

      try {
        // Prefer back-end rewrite_safe but fallback to client loop if needed
        let result = await groqRewriteSafe(text).catch(() => null);

        if (result && (result.rewritten || result.ai_probability !== undefined)) {
          // backend returned object { rewritten, ai_probability }
          const finalText = typeof result === "string" ? result : (result.rewritten ?? result);
          const score = result.ai_probability ?? 50;
          output.value = typeof finalText === "string" ? finalText : JSON.stringify(finalText, null, 2);
          setScore(score);
          return;
        }

        // fallback: do client-side loop (if backend doesn't support rewrite_safe)
        let current = text;
        let lastScore = 100;
        for (let i = 0; i < 3; i++) {
          const r = await groqExtend(current).catch(e => { throw e; }); // use extend as base rewrite if rewrite_safe missing
          const newText = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
          const detect = await groqDetect(newText).catch(() => ({ ai_probability: 50, explanation: "detect fail" }));
          lastScore = detect.ai_probability ?? 50;
          output.value = newText;
          setScore(lastScore);
          if (lastScore <= 25) break;
          current = newText;
        }
      } catch (err) {
        output.value = "Eroare rescriere: " + (err.message || err);
      }
    });
  }

  /* ---------------------------
     EXTEND & SIMPLIFY
     --------------------------- */
  const extendBtn = document.createElement("button");
  extendBtn.textContent = "Extinde";
  extendBtn.className = "btn";
  // we try to inject near UI if possible
  if (btnRewrite && btnRewrite.parentNode) btnRewrite.parentNode.appendChild(extendBtn);

  extendBtn.addEventListener("click", async () => {
    const text = (input?.value || "").trim();
    if (!text) return alert("Introdu textul pentru extindere.");
    bullets.innerHTML = "Se extinde textul...";
    try {
      const r = await groqExtend(text);
      const out = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      output.value = out;
    } catch (e) {
      output.value = "Eroare extindere: " + e.message;
    }
  });

  const simplifyBtn = document.createElement("button");
  simplifyBtn.textContent = "Simplifică";
  simplifyBtn.className = "btn";
  if (btnRewrite && btnRewrite.parentNode) btnRewrite.parentNode.appendChild(simplifyBtn);

  simplifyBtn.addEventListener("click", async () => {
    const text = (input?.value || "").trim();
    if (!text) return alert("Introdu textul pentru simplificare.");
    bullets.innerHTML = "Se simplifică textul...";
    try {
      const r = await groqSimplify(text);
      const out = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      output.value = out;
    } catch (e) {
      output.value = "Eroare simplificare: " + e.message;
    }
  });

  /* ---------------------------
     SUMMARY
     --------------------------- */
  if (btnSummary) {
    btnSummary.addEventListener("click", async () => {
      const text = (input?.value || "").trim();
      if (!text) return alert("Introdu textul pentru rezumat.");
      bullets.innerHTML = "Se generează rezumatul...";
      try {
        const r = await groqSummary(text);
        const txt = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
        bullets.innerHTML = "<ul>" + txt.split(/\n+/).filter(Boolean).map(l => `<li>${escapeHtml(l)}</li>`).join("") + "</ul>";
      } catch (e) {
        bullets.innerHTML = "Eroare la rezumat: " + e.message;
      }
    });
  }

  /* ---------------------------
     DETECT AI
     --------------------------- */
  if (btnDetect) {
    btnDetect.addEventListener("click", async () => {
      const text = (input?.value || "").trim();
      if (!text) return alert("Introdu textul pentru detectare.");
      output.value = "Se detectează AI...";
      try {
        const r = await groqDetect(text);
        // r may be { ai_probability, explanation } or nested
        const pct = r?.ai_probability ?? r?.result?.ai_probability ?? 50;
        const expl = r?.explanation ?? r?.result?.explanation ?? (typeof r === "string" ? r : JSON.stringify(r));
        setScore(pct);
        output.value = `Probabilitate AI: ${pct}%\n\nExplicație:\n${expl}`;
      } catch (e) {
        output.value = "Eroare detectare: " + e.message;
      }
    });
  }

  /* ---------------------------
     CLEAR / COPY / DOWNLOAD
     --------------------------- */
  if (btnClear) btnClear.addEventListener("click", () => { input.value = ""; output.value = ""; bullets.innerHTML = "—"; setScore(0); });
  if (copyBtn) copyBtn.addEventListener("click", async () => { await navigator.clipboard.writeText(output.value || ""); copyBtn.textContent = "Copiat!"; setTimeout(() => copyBtn.textContent = "Copiază", 1100); });
  if (downloadBtn) downloadBtn.addEventListener("click", () => {
    const blob = new Blob([output.value || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rezultat.txt"; a.click(); URL.revokeObjectURL(url);
  });

  /* ---------------------------
     MENU BUTTONS (essay, explain, translate, code)
     --------------------------- */
  menuBtns.forEach(btn => btn.addEventListener("click", async (e) => {
    const action = btn.dataset.action;
    if (!action) return;
    const text = (input?.value || "") || prompt("Introdu textul / subiectul:");
    if (!text) return;
    output.value = "Se procesează...";
    try {
      if (action === "essay") {
        const r = await studentCall("essay", text, { tone: "academic" });
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      } else if (action === "explain") {
        const r = await studentCall("explain", text, { level: "student" });
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      } else if (action === "translate") {
        const lang = prompt("Tradu în (ex: en, fr, de):", "en");
        if (!lang) return;
        const r = await studentCall("translate", text, { to: lang });
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      } else if (action === "code") {
        const task = prompt("Task (ex: explain, fix, convert):", "explain");
        const r = await studentCall("code", text, { task });
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      }
    } catch (err) {
      output.value = "Eroare: " + (err.message || err);
    }
  }));

  /* ---------------------------
     MATH PANEL TOGGLE
     --------------------------- */
  if (btnMathToggle) btnMathToggle.addEventListener("click", () => {
    if (!mathPanel) return;
    mathPanel.classList.toggle("hidden");
    if (!mathPanel.classList.contains("hidden")) mathInput?.focus();
  });

  /* ---------------------------
     MATH: FUNCTIONS PANEL & INSERTIONS
     --------------------------- */
  // create a small functions toolbox inside mathPanel (if not already in HTML)
  function createFunctionsToolbar() {
    if (!mathPanel) return;
    let toolbar = mathPanel.querySelector(".math-toolbar");
    if (toolbar) return toolbar;

    toolbar = document.createElement("div");
    toolbar.className = "math-toolbar";
    toolbar.style.display = "flex";
    toolbar.style.gap = "8px";
    toolbar.style.marginBottom = "8px";

    const funcs = [
      { id: "frac", label: "a/b", insert: "\\frac{a}{b}" },
      { id: "pow", label: "x^n", insert: "x^{n}" },
      { id: "sqrt", label: "√", insert: "\\sqrt{ }" },
      { id: "pi", label: "π", insert: "\\pi" },
      { id: "int", label: "∫", insert: "\\int " },
      { id: "sum", label: "Σ", insert: "\\sum " },
      { id: "lim", label: "lim", insert: "\\lim_{x \\to } " },
      { id: "matrix", label: "matrix", insert: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" }
    ];

    funcs.forEach(f => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = f.label;
      b.title = f.insert;
      b.addEventListener("click", () => insertAtCursor(mathInput, f.insert));
      toolbar.appendChild(b);
    });

    // add clear and insert sample
    const clearBtn = document.createElement("button");
    clearBtn.className = "btn";
    clearBtn.textContent = "Curăță";
    clearBtn.addEventListener("click", () => { if (mathInput) mathInput.value = ""; mathResult.innerHTML = ""; });
    toolbar.appendChild(clearBtn);

    mathPanel.insertBefore(toolbar, mathPanel.firstChild);
    return toolbar;
  }

  createFunctionsToolbar();

  // helper to insert text at cursor position in a textarea/input
  function insertAtCursor(el, text) {
    if (!el) return;
    el.focus();
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value || "";
    const newValue = value.slice(0, start) + text + value.slice(end);
    el.value = newValue;
    // place cursor after inserted text
    const pos = start + text.length;
    el.selectionStart = el.selectionEnd = pos;
  }

  /* ---------------------------
     MATH SOLVER: call API + render result with KaTeX
     --------------------------- */
  async function tryParseJSON(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function renderMath(obj) {
    mathResult.innerHTML = "";
    if (!obj) { mathResult.textContent = "Răspuns invalid"; return; }

    // header
    const h = document.createElement("div");
    h.innerHTML = `<strong>Problem:</strong> ${escapeHtml(obj.problem || "")}`;
    mathResult.appendChild(h);

    // steps
    (obj.steps || []).forEach((st, i) => {
      const card = document.createElement("div");
      card.className = "math-step";
      card.style.marginBottom = "10px";
      card.innerHTML = `<strong>Pas ${i+1}:</strong> ${escapeHtml(st.step || "")}<div>${escapeHtml(st.explanation || "")}</div>`;
      if (st.latex) {
        const latexDiv = document.createElement("div");
        latexDiv.className = "math-latex";
        latexDiv.innerHTML = `$$${st.latex}$$`;
        card.appendChild(latexDiv);
      }
      mathResult.appendChild(card);
    });

    // final answer
    const finalDiv = document.createElement("div");
    finalDiv.innerHTML = `<strong>Răspuns final:</strong> ${escapeHtml(obj.final_answer?.text || "")}`;
    if (obj.final_answer?.latex) {
      const ld = document.createElement("div");
      ld.innerHTML = `$$${obj.final_answer.latex}$$`;
      finalDiv.appendChild(ld);
    }
    mathResult.appendChild(finalDiv);

    // render KaTeX on newly injected content
    if (window.renderMathInElement) {
      try {
        renderMathInElement(mathResult, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }] });
      } catch (e) { console.warn("KaTeX render error:", e); }
    }
  }

  if (solveMath) {
    solveMath.addEventListener("click", async () => {
      const problem = (mathInput?.value || "").trim();
      if (!problem) return alert("Scrie problema matematică.");
      mathResult.innerHTML = "Se procesează...";
      try {
        const r = await groqMath(problem);
        // r might be string or object
        if (typeof r === "string") {
          const parsed = tryParseJSON(r);
          if (parsed && parsed.problem) {
            renderMath(parsed);
          } else {
            // attempt to display raw text nicely and highlight LaTeX
            mathResult.textContent = r;
            if (window.renderMathInElement) {
              try { renderMathInElement(mathResult, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }] }); } catch {}
            }
          }
        } else {
          // object
          const obj = r.problem ? r : (r.result ? r.result : r);
          renderMath(obj);
        }
      } catch (err) {
        mathResult.innerHTML = "Eroare: " + (err.message || err);
      }
    });
  }

  if (copyMath) copyMath.addEventListener("click", async () => {
    await navigator.clipboard.writeText(mathResult.innerText || "");
    copyMath.textContent = "Copiat!"; setTimeout(() => copyMath.textContent = "Copiază rezultat", 900);
  });

  /* ---------------------------
     small utility
     --------------------------- */
  function escapeHtml(s = "") {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // expose some functions for debugging in console
  window._humanizer = {
    rewriteSafe: groqRewriteSafe,
    detect: groqDetect,
    extend: groqExtend,
    simplify: groqSimplify,
    math: groqMath
  };

});
