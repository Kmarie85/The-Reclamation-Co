/* =========================================================
   The Reclamation Co. / Soul Stone Inc. — Base Scripts
   - Mobile nav toggle
   - GA click tracking (data-track / data-label)
   - Optional outbound link tracking
   - Footer year
   ========================================================= */

(() => {
  "use strict";

  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  const track = (action, label, extra = {}) => {
    if (!window.gtag) return;
    window.gtag("event", action || "click", {
      event_category: "engagement",
      event_label: label || "unknown",
      ...extra,
    });
  };

  onReady(() => {
    /* =========================
       Footer year helper
       ========================= */
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* =========================
       Mobile nav toggle
       Requires:
       - button.nav-toggle[data-nav-toggle]
       - nav.main-nav[data-nav-links]
       ========================= */
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navLinks = document.querySelector("[data-nav-links]");

    if (navToggle && navLinks) {
      navToggle.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      // Close menu after clicking a nav link (mobile UX)
      navLinks.addEventListener("click", (e) => {
        const a = e.target.closest("a");
        if (!a) return;

        // Only close if menu is currently open (mobile)
        if (navLinks.classList.contains("is-open")) {
          navLinks.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        }
      });

      // Close menu with Escape
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!navLinks.classList.contains("is-open")) return;
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    }

    /* =========================
       GA click tracking
       Tracks any element with:
       data-track="action_name"
       data-label="label_here" (optional)
       ========================= */
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-track]");
      if (!el) return;

      const action = el.getAttribute("data-track") || "click";

      // Prefer explicit label, fallback to text, fallback to href, fallback to unknown
      const explicitLabel = el.getAttribute("data-label");
      const textLabel = (el.textContent || "").trim().slice(0, 80);
      const hrefLabel =
        el.tagName === "A" ? (el.getAttribute("href") || "").trim().slice(0, 120) : "";
      const label = explicitLabel || textLabel || hrefLabel || "unknown";

      track(action, label);
    });

    /* =========================
       Optional: outbound link tracking
       Adds event when clicking external links.
       Safe: only runs if GA exists.
       ========================= */
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href) return;

      // Ignore in-page anchors and tel/mail links
      if (href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) return;

      // Only treat as outbound if it's absolute and not this site's origin
      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin === window.location.origin) return;

      // Track outbound clicks
      track("outbound_click", url.href);
    });
  });
})();
