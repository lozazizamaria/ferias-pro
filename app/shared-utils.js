/* ==========================================================================
   My Plan — Utilitários Compartilhados Zero-Dependências (v58)
   Browser (window.MyPlanUtils) + Node.js (module.exports p/ testes unitários)
   ========================================================================== */
(function (root) {
  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function safeCmpIso(a, b) {
    return String(a || "").localeCompare(String(b || ""));
  }

  function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    if (options && options.signal) return fetch(url, options);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error(`Tempo limite excedido (${Math.round(timeoutMs / 1000)}s)`)), timeoutMs);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  function sanitizeStyleAttr(rawStyle) {
    const safeProps = new Set([
      "color", "background", "background-color", "font-weight", "font-style",
      "text-decoration", "text-align", "font-size", "font-family",
      "margin", "margin-top", "margin-bottom", "margin-left", "margin-right",
      "padding", "padding-top", "padding-bottom", "padding-left", "padding-right",
      "border", "border-collapse", "width", "max-width", "height"
    ]);
    const clean = [];
    String(rawStyle || "").split(";").forEach(decl => {
      const idx = decl.indexOf(":");
      if (idx <= 0) return;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();
      if (!safeProps.has(prop) || !val) return;
      if (/url\s*\(|expression\s*\(|javascript:|vbscript:|@import|-moz-binding/i.test(val)) return;
      clean.push(`${prop}: ${val}`);
    });
    return clean.join("; ");
  }

  function sanitizeMinuteHtml(rawHtml) {
    const fallback = "<p><br></p>";
    const str = String(rawHtml || "").trim();
    if (!str) return fallback;
    if (typeof DOMParser === "undefined") {
      // Fallback defensivo em ambiente sem DOM (ex: testes Node)
      return str
        .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|button|textarea|select|option|link|meta|base|noscript|template)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
        .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/javascript\s*:/gi, "") || fallback;
    }

    const DROP_TAGS = new Set([
      "script", "style", "iframe", "object", "embed", "svg", "math",
      "form", "button", "textarea", "select", "option", "link", "meta",
      "base", "noscript", "template", "audio", "video", "source", "track",
      "frame", "frameset"
    ]);
    const ALLOW_TAGS = new Set([
      "p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "b", "strong", "i", "em", "u", "s", "strike", "del",
      "blockquote", "pre", "code", "hr", "table", "thead", "tbody", "tfoot",
      "tr", "th", "td", "a", "span", "img", "sub", "sup", "font", "colgroup", "col", "input"
    ]);
    const doc = new DOMParser().parseFromString(`<div>${str}</div>`, "text/html");
    const rootEl = doc.body.firstElementChild;
    if (!rootEl) return fallback;

    const cleanNode = (node) => {
      const children = [...node.childNodes];
      for (const ch of children) {
        if (ch.nodeType === 8) { ch.remove(); continue; }
        if (ch.nodeType !== 1) continue;
        const tag = ch.tagName.toLowerCase();
        if (DROP_TAGS.has(tag)) { ch.remove(); continue; }
        if (tag === "input") {
          const tp = String(ch.getAttribute("type") || "").toLowerCase();
          if (tp !== "checkbox") { ch.remove(); continue; }
          const isChecked = ch.hasAttribute("checked");
          for (const a of [...ch.attributes]) ch.removeAttribute(a.name);
          ch.setAttribute("type", "checkbox");
          if (isChecked) ch.setAttribute("checked", "");
          continue;
        }
        if (!ALLOW_TAGS.has(tag)) {
          cleanNode(ch);
          while (ch.firstChild) node.insertBefore(ch.firstChild, ch);
          ch.remove();
          continue;
        }
        for (const attr of [...ch.attributes]) {
          const name = attr.name.toLowerCase();
          const val = attr.value;
          if (name.startsWith("on") || name === "srcdoc" || name === "formaction") {
            ch.removeAttribute(attr.name);
            continue;
          }
          if (name === "class") {
            const safeClass = String(val).replace(/[^a-zA-Z0-9_\- ]+/g, "").trim();
            if (safeClass) ch.setAttribute("class", safeClass);
            else ch.removeAttribute("class");
            continue;
          }
          if (name === "style") {
            const safeStyle = sanitizeStyleAttr(val);
            if (safeStyle) ch.setAttribute("style", safeStyle);
            else ch.removeAttribute("style");
            continue;
          }
          if (name === "data-pm-open-card" && (tag === "span" || tag === "a")) {
            const cid = String(val).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
            if (cid) ch.setAttribute("data-pm-open-card", cid);
            else ch.removeAttribute("data-pm-open-card");
            continue;
          }
          if (name === "dir" || name === "align" || name === "title") continue;
          if (tag === "a" && name === "href") {
            const trimmed = String(val || "").trim();
            if (/^(https?:\/\/|mailto:|tel:|#)/i.test(trimmed)) ch.setAttribute("href", trimmed);
            else ch.removeAttribute("href");
            continue;
          }
          if (tag === "a" && name === "target") {
            if (val === "_blank") {
              ch.setAttribute("target", "_blank");
              ch.setAttribute("rel", "noopener noreferrer");
            } else {
              ch.removeAttribute("target");
            }
            continue;
          }
          if (tag === "img" && name === "src") {
            const trimmed = String(val || "").trim();
            if (/^(data:image\/(png|jpe?g|gif|webp);base64,|https?:\/\/|\/api\/attachments\/)/i.test(trimmed)) {
              ch.setAttribute("src", trimmed);
            } else {
              ch.removeAttribute("src");
            }
            continue;
          }
          if (tag === "img" && (name === "alt" || name === "width" || name === "height")) continue;
          if ((tag === "td" || tag === "th" || tag === "col") && (name === "colspan" || name === "rowspan" || name === "scope")) continue;
          if (tag === "font" && (name === "color" || name === "face" || name === "size")) continue;
          ch.removeAttribute(attr.name);
        }
        cleanNode(ch);
      }
    };

    cleanNode(rootEl);
    return rootEl.innerHTML.trim() ? rootEl.innerHTML : fallback;
  }

  let promptPendingResolve = null;

  function myplanPromptDialog({
    title = "Informar valor",
    label = "Valor",
    value = "",
    placeholder = "",
    inputType = "text",
    required = true,
    secondLabel = "",
    secondValue = "",
    secondPlaceholder = "",
    submitLabel = "Confirmar",
    readOnly = false
  } = {}) {
    if (typeof document === "undefined") return Promise.resolve(null);
    const dlg = document.getElementById("myplanPromptModal");
    const form = document.getElementById("myplanPromptForm");
    const titleEl = document.getElementById("mpPromptTitle");
    const lbl1 = document.getElementById("mpPromptLabel1");
    const inp1 = document.getElementById("mpPromptInput1");
    const wrap2 = document.getElementById("mpPromptWrap2");
    const lbl2 = document.getElementById("mpPromptLabel2");
    const inp2 = document.getElementById("mpPromptInput2");
    const btnOk = document.getElementById("btnMpPromptOk");
    const btnCancel = document.getElementById("btnMpPromptCancel");
    const btnClose = document.getElementById("btnMpPromptClose");
    if (!dlg || !form || !inp1) return Promise.resolve(null);

    if (promptPendingResolve) {
      const prev = promptPendingResolve;
      promptPendingResolve = null;
      prev(null);
    }

    if (titleEl) titleEl.textContent = title;
    if (lbl1) lbl1.textContent = label;
    inp1.type = inputType || "text";
    inp1.value = String(value ?? "");
    inp1.placeholder = placeholder || "";
    inp1.required = Boolean(required);
    inp1.readOnly = Boolean(readOnly);

    const hasSecond = Boolean(secondLabel);
    if (wrap2) wrap2.hidden = !hasSecond;
    if (lbl2) lbl2.textContent = secondLabel || "";
    if (inp2) {
      inp2.value = String(secondValue ?? "");
      inp2.placeholder = secondPlaceholder || "";
      inp2.required = false;
    }
    if (btnOk) btnOk.textContent = submitLabel || "Confirmar";

    return new Promise(resolve => {
      promptPendingResolve = resolve;
      const finish = (val) => {
        if (promptPendingResolve !== resolve) return;
        promptPendingResolve = null;
        if (dlg.open) dlg.close();
        resolve(val);
      };

      form.onsubmit = e => {
        e.preventDefault();
        const v1 = inp1.value.trim();
        if (required && !v1) return;
        if (hasSecond) finish({ value: v1, secondValue: (inp2?.value || "").trim() });
        else finish(v1);
      };
      if (btnCancel) btnCancel.onclick = () => finish(null);
      if (btnClose) btnClose.onclick = () => finish(null);
      dlg.oncancel = e => { e.preventDefault(); finish(null); };

      if (!dlg.open) dlg.showModal();
      setTimeout(() => {
        inp1.focus();
        if (readOnly) inp1.select();
      }, 25);
    });
  }

  const api = {
    esc,
    safeCmpIso,
    fetchWithTimeout,
    sanitizeStyleAttr,
    sanitizeMinuteHtml,
    myplanPromptDialog
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else if (root) {
    root.MyPlanUtils = api;
    root.myplanPromptDialog = myplanPromptDialog;
  }
})(typeof window !== "undefined" ? window : globalThis);
