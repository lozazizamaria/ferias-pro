/* ==========================================================================
   My Plan — Landing Page Interativa (Abas, Fallback de Prints & Scroll Reveal)
   ========================================================================== */
(() => {
  const yr = document.getElementById("lpYear");
  if (yr) yr.textContent = String(new Date().getFullYear());

  // 1. Sombra sutil na navbar ao rolar
  const nav = document.getElementById("lpNav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // 2. Menu mobile compacto
  const menuBtn = document.getElementById("lpMobileMenuBtn");
  const drawer = document.getElementById("lpMobileDrawer");
  if (menuBtn && drawer) {
    const closeDrawer = () => {
      drawer.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    };
    menuBtn.addEventListener("click", () => {
      const willOpen = drawer.hidden;
      drawer.hidden = !willOpen;
      menuBtn.setAttribute("aria-expanded", String(willOpen));
    });
    drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", closeDrawer));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !drawer.hidden) closeDrawer();
    });
  }

  // 3. Abas acessíveis: Modo Profissional | Modo Pessoal | Visão de Conflitos
  const tablist = document.getElementById("lpModesTablist");
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const panelMap = {
      pro: document.getElementById("lpPanelPro"),
      personal: document.getElementById("lpPanelPersonal"),
      conflicts: document.getElementById("lpPanelConflicts")
    };
    const activateTab = (tab) => {
      const key = tab.dataset.lpTab;
      tabs.forEach(t => t.setAttribute("aria-selected", String(t === tab)));
      Object.entries(panelMap).forEach(([k, panel]) => {
        if (panel) panel.hidden = k !== key;
      });
      tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    tabs.forEach((tab, idx) => {
      tab.addEventListener("click", () => activateTab(tab));
      tab.addEventListener("keydown", e => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
          e.preventDefault();
          let nextIdx = idx;
          if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
          else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") nextIdx = 0;
          else if (e.key === "End") nextIdx = tabs.length - 1;
          tabs[nextIdx].focus();
          activateTab(tabs[nextIdx]);
        }
      });
    });
  }

  // 4. Fallback elegante para qualquer print que ainda não esteja na pasta /public/screenshots/
  document.querySelectorAll("[data-shot-box] img").forEach(img => {
    const box = img.closest("[data-shot-box]");
    if (!box) return;
    const markFallback = () => box.classList.add("is-fallback");
    const clearFallback = () => {
      if (img.naturalWidth > 0) box.classList.remove("is-fallback");
    };
    img.addEventListener("error", markFallback);
    img.addEventListener("load", clearFallback);
    if (img.complete) {
      if (img.naturalWidth === 0) markFallback();
      else clearFallback();
    }
  });

  // 5. Scroll Reveal progressivo (fallback IntersectionObserver apenas se CSS view() não for suportado)
  const supportsViewTimeline = typeof CSS !== "undefined"
    && CSS.supports("(animation-timeline: view()) and (animation-range: entry)");
  const allowMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  if (!supportsViewTimeline && allowMotion && "IntersectionObserver" in window) {
    const els = [...document.querySelectorAll(".lp-reveal")];
    els.forEach(el => el.classList.add("is-io-pending"));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("is-io-pending");
          entry.target.classList.add("is-io-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }
})();
