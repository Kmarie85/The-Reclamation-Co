/* =========================================================
   The Reclamation Co. / Soul Stone Inc. — Base Scripts
   - Optional GA4 loader (set window.GA4_MEASUREMENT_ID in HTML)
   - GA click tracking (data-track / data-label)
   - Outbound link tracking (no double-fire)
   - Mobile nav toggle
   - Footer year
   - Contact form interest prefill (URL param)
   - Thank-you page view tracking
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

  /* =========================
     GA4 (optional)
     - Set window.GA4_MEASUREMENT_ID = "G-XXXX..." in the HTML head.
     - If blank, GA will not load (site can launch without analytics).
  ========================= */
  const initGA4 = () => {
    const idRaw = (window.GA4_MEASUREMENT_ID || "").toString().trim();
    const valid = /^G-[A-Z0-9]{6,}$/i.test(idRaw);
    if (!valid) return;

    // Avoid double-init
    if (window.__ga4_initialized) return;
    window.__ga4_initialized = true;

    // Load gtag.js
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      idRaw
    )}`;
    document.head.appendChild(s);

    // Init gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", idRaw, { anonymize_ip: true });
  };

  initGA4();

  const hasGA = () => typeof window.gtag === "function";

  const track = (action, label, extra = {}) => {
    if (!hasGA()) return;
    window.gtag("event", action || "click", {
      event_category: "engagement",
      event_label: label || "unknown",
      ...extra,
    });
  };

  const isOutboundLink = (a) => {
    if (!a || a.tagName !== "A") return false;

    const href = (a.getAttribute("href") || "").trim();
    if (!href) return false;

    // Ignore in-page anchors and tel/mail links
    if (
      href.startsWith("#") ||
      href.startsWith("tel:") ||
      href.startsWith("mailto:")
    )
      return false;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return false;
    }

    return url.origin !== window.location.origin;
  };

  onReady(() => {
    /* =========================
       Footer year helper
       ========================= */
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* =========================
       Thank-you page view tracking
       Fires once per load on /thank-you.html
       ========================= */
    if (/thank-you\.html$/i.test(window.location.pathname)) {
      track("thank_you_view", "contact_form_thank_you", {
        page_path: window.location.pathname,
      });
    }

    /* =========================
       Contact form prefill (from URL)
       Example URLs:
       - contact.html?interest=community
       - contact.html?interest=private_support
       - contact.html?interest=soul_reset_bundle
       ========================= */
    if (/contact\.html$/i.test(window.location.pathname)) {
      const params = new URLSearchParams(window.location.search);
      const interest = (params.get("interest") || "").trim();
      if (interest) {
        const select = document.querySelector('select[name="interest"]');
        if (select) {
          const desired = interest.toLowerCase();

          for (const opt of Array.from(select.options)) {
            if ((opt.value || "").toLowerCase() === desired) {
              opt.selected = true;
              break;
            }
          }

          try {
            select.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
        }
      }
    }

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

      // Close menu after clicking any nav link (mobile UX)
      navLinks.addEventListener("click", (e) => {
        const a = e.target.closest("a");
        if (!a) return;

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
       Single click handler for analytics
       - Tracks data-track elements
       - Tracks outbound links (without double firing)
       ========================= */
    document.addEventListener("click", (e) => {
      // 1) Outbound link tracking (first, so we can stop double counts)
      const a = e.target.closest("a[href]");
      if (a && isOutboundLink(a)) {
        // If you already explicitly track this element, don’t auto-track it again.
        if (!a.hasAttribute("data-track")) {
          const href = a.getAttribute("href");
          track("outbound_click", href);

          // If same-tab outbound navigation, give GA a breath to send
          const opensNewTab = a.getAttribute("target") === "_blank";
          const hasModifier =
            e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

          if (!opensNewTab && !hasModifier) {
            e.preventDefault();
            setTimeout(() => {
              window.location.href = href;
            }, 150);
          }
        }
        return; // prevent also being handled by data-track lookup below
      }

      // 2) Standard data-track tracking
      const el = e.target.closest("[data-track]");
      if (!el) return;

      const action = el.getAttribute("data-track") || "click";

      const explicitLabel = el.getAttribute("data-label");
      const textLabel = (el.textContent || "").trim().slice(0, 80);
      const hrefLabel =
        el.tagName === "A"
          ? (el.getAttribute("href") || "").trim().slice(0, 120)
          : "";
      const label = explicitLabel || textLabel || hrefLabel || "unknown";

      track(action, label);
    });
  });
})();
