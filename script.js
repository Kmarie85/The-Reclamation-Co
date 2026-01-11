// Soul Stone Inc. — base scripts
(() => {
  // Basic GA click tracking for any element with data-track + optional data-label
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (!el) return;

    const action = el.getAttribute("data-track") || "click";
    const label = el.getAttribute("data-label") || el.textContent.trim().slice(0, 80) || "unknown";

    if (window.gtag) {
      window.gtag("event", action, {
        event_category: "engagement",
        event_label: label,
      });
    }
  });
})();
