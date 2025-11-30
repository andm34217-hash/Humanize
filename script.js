// script.js (actualizat)
// Include: theme, groq calls, rewrite -> detect score, summary fix,
// math functions toolbar with fraction widget + preview + insert

document.addEventListener("DOMContentLoaded", () => {
  /* THEME */
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
  applyTheme(localStorage.getItem("theme") || "light");
  if (themeToggle) themeToggle.addEventListener("click", () => {
    applyTheme(html.classList.contains("dark") ? "light" : "dark");
  });

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

  // Math elements
  const btnMathToggle = document.getElementById("btnMathToggle");
  const mathPanel = document.getElementById("mathPanel");
  const mathInput = document.getElementById("mathInput");
  const solveMath = document.getElementById("solveMath");
  const mathResult = document.getElementById("mathResult");
  const copyMath = document.getElementById("copyMath");

  const menuBtns = document.querySelectorAll(".menu-btn");

  const progressFill = document.getElementById("progressFill");
  const scorePct = document.getElementById("scorePct");
  function setScore(p) {
    p = Math.max(0, Math.min(100, Math.round(p || 0)));
    if (progressFill) progressFill.style.width = p + "%";
    if (scorePct) scorePct.textContent = p + "%";
  }

  /* API helper */
  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    if (!res.ok) {
      const message = (json && (json.error || json.message)) || text || res.statusText;
      throw new Error(message);
    }
    // if json has result return it, otherwise return parsed or raw text
    if (json && json.result !== undefined) return json.result;
    if (json) return json;
    return text;
  }

  /* GROQ shorthand */
  async function groqRewriteSafe(text) { return apiPost("/api/groq", { mode: "rewrite_safe", text }); }
  async function groqSummary(text) { return apiPost("/api/groq", { mode: "summary", text }); }
  async function groqExtend(text) { return apiPost("/api/groq", { mode: "extend", text }); }
  async function groqSimplify(text) { return apiPost("/api/groq", { mode: "simplify", text }); }
  async function groqDetect(text) { return apiPost("/api/groq", { mode: "detect", text }); }
  async function groqMath(text) { return apiPost("/api/groq", { mode: "math_solver", text }); }
  async function studentCall(mode, text, options = {}) { return apiPost("/api/student", { mode, text, options }); }

  /* Utilities */
  function escapeHtml(s = "") { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
  function tryParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }
  function insertAtCursor(el, text) {
    if (!el) return;
    el.focus();
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value || "";
    const newValue = value.slice(0, start) + text + value.slice(end);
    el.value = newValue;
    const pos = start + text.length;
    el.selectionStart = el.selectionEnd = pos;
  }

  /* ========== REWRITE (with detect after) ========== */
  if (btnRewrite) {
    btnRewrite.addEventListener("click", async () => {
      const text = (input?.value || "").trim();
      if (!text) return alert("Introdu textul pe care vrei să-l rescrii.");

      output.value = "Se rescrie... (așteaptă)";
      setScore(0);

      try {
        // prefer backend rewrite_safe
        const res = await groqRewriteSafe(text).catch(() => null);

        if (res && (res.rewritten || res.ai_probability !== undefined)) {
          // backend returned object {rewritten, ai_probability}
          const final = typeof res === "string" ? res : (res.rewritten ?? JSON.stringify(res));
          const score = res.ai_probability ?? 50;
          output.value = typeof final === "string" ? final : JSON.stringify(final, null, 2);
          setScore(score);
          return;
        }

        // fallback: if backend didn't return structured object, try to call rewrite once then detect
        const fallback = await groqExtend(text).catch(e => { throw e; });
        const fallbackText = typeof fallback === "string" ? fallback : (fallback.result ?? JSON.stringify(fallback));
        // detect
        const detect = await groqDetect(fallbackText).catch(() => ({ ai_probability: 50 }));
        setScore(detect.ai_probability ?? 50);
        output.value = fallbackText;

      } catch (err) {
        output.value = "Eroare rescriere: " + (err.message || err);
      }
    });
  }

  /* ========== EXTEND & SIMPLIFY buttons (and menu actions) ========== */
  // The sidebar buttons with data-action="extend" or "simplify" will call these
  menuBtns.forEach(btn => btn.addEventListener("click", async (e) => {
    const action = btn.dataset.action;
    if (!action) return;
    const text = (input?.value || "") || prompt("Introdu textul / subiectul:");
    if (!text) return;
    output.value = "Se procesează...";
    try {
      if (action === "extend" || action === "extend") {
        const r = await groqExtend(text);
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      } else if (action === "simplify") {
        const r = await groqSimplify(text);
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      } else if (action === "summary") {
        // handled elsewhere
      } else if (action === "rewrite") {
        btnRewrite.click();
      } else if (action === "detect") {
        btnDetect.click();
      } else if (action === "essay") {
        const r = await studentCall("essay", text, { tone: "academic" });
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      } else if (action === "explain") {
        const r = await studentCall("explain", text, { level: "student" });
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      } else if (action === "translate") {
        const lang = prompt("Tradu în (ex: en):", "en");
        if (!lang) return;
        const r = await studentCall("translate", text, { to: lang });
        output.value = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
      }
    } catch (err) {
      output.value = "Eroare: " + (err.message || err);
    }
  }));

  /* ========== SUMMARY (fix) ========== */
  if (btnSummary) {
    btnSummary.addEventListener("click", async () => {
      const text = (input?.value || "").trim();
      if (!text) return alert("Introdu textul pentru rezumat!");
      bullets.innerHTML = "Se generează rezumatul...";
      try {
        const r = await groqSummary(text);
        const txt = typeof r === "string" ? r : (r.result ?? JSON.stringify(r));
        bullets.innerHTML = "<ul>" + txt.split(/\n+/).filter(Boolean).map(l => `<li>${escapeHtml(l)}</li>`).join("") + "</ul>";
      } catch (e) {
        bullets.innerHTML = "Eroare la rezumat: " + (e.message || e);
      }
    });
  }

  /* ========== DETECT ========== */
  if (btnDetect) {
    btnDetect.addEventListener("click", async () => {
      const text = (input?.value || "").trim();
      if (!text) return alert("Introdu textul pentru detectare.");
      output.value = "Se detectează AI...";
      try {
        const r = await groqDetect(text);
        const pct = r?.ai_probability ?? r?.result?.ai_probability ?? 50;
        const expl = r?.explanation ?? r?.result?.explanation ?? (typeof r === "string" ? r : JSON.stringify(r));
        setScore(pct);
        output.value = `Probabilitate AI: ${pct}%\n\nExplicație:\n${expl}`;
      } catch (e) {
        output.value = "Eroare detectare: " + (e.message || e);
      }
    });
  }

  /* ========== CLEAR / COPY / DOWNLOAD ========== */
  if (btnClear) btnClear.addEventListener("click", () => { input.value = ""; output.value = ""; bullets.innerHTML = "—"; setScore(0); });
  if (copyBtn) copyBtn.addEventListener("click", async () => { await navigator.clipboard.writeText(output.value || ""); copyBtn.textContent = "Copiat!"; setTimeout(() => copyBtn.textContent = "Copiază", 1100); });
  if (downloadBtn) downloadBtn.addEventListener("click", () => {
    const blob = new Blob([output.value || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rezultat.txt"; a.click(); URL.revokeObjectURL(url);
  });

  /* ========== MATH PANEL toggle ========== */
  if (btnMathToggle) btnMathToggle.addEventListener("click", () => {
    if (!mathPanel) return;
    mathPanel.classList.toggle("hidden");
    if (!mathPanel.classList.contains("hidden")) mathInput?.focus();
  });

  /* ========== Math toolbar creation with fraction widget ========== */
  function createFunctionsToolbar() {
    if (!mathPanel) return;
    let toolbar = mathPanel.querySelector(".math-toolbar");
    if (toolbar) return toolbar;

    toolbar = document.createElement("div");
    toolbar.className = "math-toolbar";

    // Buttons array
    const funcs = [
      { id: "frac", label: "a/b", type: "widget" },
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
      if (f.type === "widget") {
        b.addEventListener("click", () => openFractionWidget());
      } else {
        b.addEventListener("click", () => insertAtCursor(mathInput, f.insert));
      }
      toolbar.appendChild(b);
    });

    // sample & clear
    const sample = document.createElement("button");
    sample.className = "btn";
    sample.textContent = "Insert sample";
    sample.addEventListener("click", () => {
      insertAtCursor(mathInput, "\\frac{3}{4}");
    });
    toolbar.appendChild(sample);

    const clearBtn = document.createElement("button");
    clearBtn.className = "btn";
    clearBtn.textContent = "Curăță";
    clearBtn.addEventListener("click", () => { if (mathInput) mathInput.value = ""; mathResult.innerHTML = ""; });
    toolbar.appendChild(clearBtn);

    // preview container
    const preview = document.createElement("div");
    preview.className = "math-preview";
    preview.style.marginTop = "8px";
    toolbar.appendChild(preview);

    mathPanel.insertBefore(toolbar, mathPanel.firstChild);
    return toolbar;
  }

  const toolbar = createFunctionsToolbar();

  // FRACTION WIDGET (inline modal inside toolbar)
  function openFractionWidget() {
    // if already open, do nothing
    if (!toolbar) return;

    // remove existing widget if any
    const existing = toolbar.querySelector(".frac-widget");
    if (existing) { existing.remove(); return; }

    const w = document.createElement("div");
    w.className = "frac-widget";
    w.style.display = "flex";
    w.style.gap = "8px";
    w.style.alignItems = "center";
    w.style.marginTop = "8px";

    // inputs for numerator and denominator
    const num = document.createElement("input");
    num.type = "text";
    num.placeholder = "numărător";
    num.style.width = "80px";
    num.className = "frac-input";

    const den = document.createElement("input");
    den.type = "text";
    den.placeholder = "numitor";
    den.style.width = "80px";
    den.className = "frac-input";

    // preview element
    const pv = document.createElement("div");
    pv.className = "frac-preview";
    pv.style.minWidth = "80px";

    function updatePreview() {
      const a = num.value.trim() || "a";
      const b = den.value.trim() || "b";
      pv.innerHTML = `$$\\frac{${escapeLatex(a)}}{${escapeLatex(b)}}$$`;
      if (window.renderMathInElement) {
        try { renderMathInElement(pv, { delimiters: [{ left: '$$', right: '$$', display: true }] }); } catch(e){/*ignore*/ }
      }
    }

    num.addEventListener("input", updatePreview);
    den.addEventListener("input", updatePreview);

    // insert button
    const insertBtn = document.createElement("button");
    insertBtn.className = "btn primary";
    insertBtn.textContent = "Insert";
    insertBtn.addEventListener("click", () => {
      const a = num.value.trim() || "a";
      const b = den.value.trim() || "b";
      const latex = `\\frac{${a}}{${b}}`;
      insertAtCursor(mathInput, latex);
      // remove widget after insert
      w.remove();
      mathInput.focus();
    });

    // cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.textContent = "Anulează";
    cancelBtn.addEventListener("click", () => w.remove());

    w.appendChild(num);
    w.appendChild(den);
    w.appendChild(pv);
    w.appendChild(insertBtn);
    w.appendChild(cancelBtn);

    toolbar.appendChild(w);
    num.focus();
    updatePreview();
  }

  function escapeLatex(s = "") {
    // basic escape for backslashes & braces in preview generation
    return String(s).replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}");
  }

  /* ========== MATH SOLVER (rendering) ========== */
  if (solveMath) {
    solveMath.addEventListener("click", async () => {
      const problem = (mathInput?.value || "").trim();
      if (!problem) return alert("Scrie problema matematică.");
      mathResult.innerHTML = "Se procesează...";
      try {
        const r = await groqMath(problem);
        // r may be string or object
        if (typeof r === "string") {
          const parsed = tryParseJSON(r);
          if (parsed && parsed.problem) {
            renderMath(parsed);
          } else {
            // put raw text and render any LaTeX
            mathResult.textContent = "";
            const pre = document.createElement("pre");
            pre.textContent = r;
            mathResult.appendChild(pre);
            if (window.renderMathInElement) {
              try { renderMathInElement(mathResult, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }); } catch {}
            }
          }
        } else {
          const obj = r.problem ? r : (r.result ? r.result : r);
          renderMath(obj);
        }
      } catch (err) {
        mathResult.innerHTML = "Eroare: " + (err.message || err);
      }
    });
  }

  function renderMath(obj) {
    mathResult.innerHTML = "";
    if (!obj) { mathResult.textContent = "Răspuns invalid"; return; }
    const header = document.createElement("div"); header.innerHTML = `<strong>Problem:</strong> ${escapeHtml(obj.problem || "")}`; mathResult.appendChild(header);
    (obj.steps || []).forEach((s,i) => {
      const card = document.createElement("div"); card.className = "math-step";
      card.innerHTML = `<strong>Pas ${i+1}:</strong> ${escapeHtml(s.step || "")}<div>${escapeHtml(s.explanation || "")}</div>`;
      if (s.latex) {
        const ld = document.createElement("div"); ld.innerHTML = `$$${s.latex}$$`; card.appendChild(ld);
      }
      mathResult.appendChild(card);
    });
    const fa = document.createElement("div"); fa.innerHTML = `<strong>Răspuns final:</strong> ${escapeHtml(obj.final_answer?.text || "")}`; if (obj.final_answer?.latex) { const ld = document.createElement("div"); ld.innerHTML = `$$${obj.final_answer.latex}$$`; fa.appendChild(ld); } mathResult.appendChild(fa);
    if (window.renderMathInElement) {
      try { renderMathInElement(mathResult, { delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}] }); } catch(e) { console.warn(e); }
    }
  }

  if (copyMath) copyMath.addEventListener("click", async () => { await navigator.clipboard.writeText(mathResult.innerText || ""); copyMath.textContent = "Copiat!"; setTimeout(()=> copyMath.textContent = "Copiază rezultat",900); });

  /* expose for debug */
  window._humanizer = { groqRewriteSafe, groqDetect, groqExtend, groqSimplify, groqSummary, groqMath };
});
