/* =========================================================
   The Reclamation Co. / Soul Stone Inc. — Base Scripts
   - Optional GA4 loader (set window.GA4_MEASUREMENT_ID in HTML)
   - GA click tracking (data-track / data-label)
   - Outbound link tracking (no double-fire)
   - Mobile nav toggle
   - Footer year
   - Contact form prefill (from URL)
   - Formspree submit handler (forces on-site thank-you redirect)
   - Sticky header offset + reliable anchor scrolling (FIXED)
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
  ========================= */
  const initGA4 = () => {
    const idRaw = (window.GA4_MEASUREMENT_ID || "").toString().trim();
    const valid = /^G-[A-Z0-9]{6,}$/i.test(idRaw);
    if (!valid) return;

    if (window.__ga4_initialized) return;
    window.__ga4_initialized = true;

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      idRaw
    )}`;
    document.head.appendChild(s);

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

    if (
      href.startsWith("#") ||
      href.startsWith("tel:") ||
      href.startsWith("mailto:")
    ) {
      return false;
    }

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
       Sticky header offset + reliable anchor scrolling
       - fixes "section hidden under header"
       - fixes hash jumps (including dropdown links)
       ========================= */
    (() => {
      const header = document.querySelector(".site-header");
      if (!header) return;

      const setHeaderOffset = () => {
        const h = Math.ceil(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--header-offset", `${h}px`);
      };

      const scrollToHash = (hash) => {
        if (!hash) return;
        const el = document.querySelector(decodeURIComponent(hash));
        if (!el) return;

        // Let layout settle, then scroll with measured offset
        requestAnimationFrame(() => {
          setHeaderOffset();
          const offset =
            parseInt(
              getComputedStyle(document.documentElement)
                .getPropertyValue("--header-offset")
                .trim(),
              10
            ) || 0;

          const y = el.getBoundingClientRect().top + window.pageYOffset - offset - 16;
          window.scrollTo({ top: y, behavior: "smooth" });
        });
      };

      // initial load with hash
      if (window.location.hash) scrollToHash(window.location.hash);

      // keep offset accurate
      setHeaderOffset();
      window.addEventListener("resize", setHeaderOffset);
      window.addEventListener("orientationchange", setHeaderOffset);

      // intercept in-page anchor clicks (prevents hiding under sticky header)
      document.addEventListener("click", (e) => {
        const a = e.target.closest('a[href^="#"], a[href*="services.html#"]');
        if (!a) return;

        const href = a.getAttribute("href") || "";
        const hash = href.includes("#") ? "#" + href.split("#")[1] : href;
        if (!hash || hash === "#") return;

        e.preventDefault();
        history.pushState(null, "", hash);
        scrollToHash(hash);

        // close dropdown after selecting a link
        const openDetails = a.closest("details.nav-dropdown[open]");
        if (openDetails) openDetails.removeAttribute("open");

        // close mobile nav too (if open)
        const navLinks = document.querySelector("[data-nav-links]");
        const navToggle = document.querySelector("[data-nav-toggle]");
        if (navLinks && navLinks.classList.contains("is-open")) {
          navLinks.classList.remove("is-open");
          if (navToggle) navToggle.setAttribute("aria-expanded", "false");
        }
      });

      // close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        const dd = document.querySelector("details.nav-dropdown[open]");
        if (!dd) return;
        if (e.target.closest("details.nav-dropdown")) return;
        dd.removeAttribute("open");
      });
    })();

    /* =========================
       Contact form prefill (from URL)
       Example: contact.html?interest=community
       ========================= */
    (() => {
      const params = new URLSearchParams(window.location.search);
      const interest = (params.get("interest") || "").trim();
      if (!interest) return;

      if (!/contact\.html$/i.test(window.location.pathname)) return;

      const select = document.querySelector('select[name="interest"]');
      if (!select) return;

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
    })();

    /* =========================
       Mobile nav toggle
       ========================= */
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navLinks = document.querySelector("[data-nav-links]");

    if (navToggle && navLinks) {
      navToggle.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      // close nav after any link click (mobile)
      navLinks.addEventListener("click", (e) => {
        const a = e.target.closest("a[href]");
        if (!a) return;

        if (navLinks.classList.contains("is-open")) {
          navLinks.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!navLinks.classList.contains("is-open")) return;
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    }

    /* =========================
       Formspree submit handler
       Forces redirect to your on-site thank-you page.
       ========================= */
    (() => {
      if (!/contact\.html$/i.test(window.location.pathname)) return;

      const form = document.querySelector('form[action*="formspree.io/f/"]');
      if (!form) return;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const action = form.getAttribute("action");
        const method = (form.getAttribute("method") || "POST").toUpperCase();

        const nextInput = form.querySelector('input[name="_next"]');
        const nextUrl =
          (nextInput && nextInput.value) ||
          "https://www.soulstoneinc.org/thank-you.html";

        try {
          const res = await fetch(action, {
            method,
            body: new FormData(form),
            headers: { Accept: "application/json" },
          });

          if (res.ok) {
            track("contact_submit_success", "contact_form_success");
            window.location.href = nextUrl;
            return;
          }

          track("contact_submit_error", "contact_form_error", { status: res.status });
          form.submit();
        } catch {
          track("contact_submit_error", "contact_form_error_network");
          form.submit();
        }
      });
    })();

    /* =========================
       Single click handler for analytics
       ========================= */
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (a && isOutboundLink(a)) {
        if (!a.hasAttribute("data-track")) {
          const href = a.getAttribute("href");
          track("outbound_click", href);

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
        return;
      }

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
