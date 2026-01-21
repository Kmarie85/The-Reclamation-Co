/* =========================================================
   The Reclamation Co. / Soul Stone Inc. — Base Scripts
   - Optional GA4 loader (set window.GA4_MEASUREMENT_ID in HTML)
   - GA click tracking (data-track / data-label)
   - Outbound link tracking (no double-fire)
   - Sticky header anchor offset (no hidden section titles)
   - Mobile nav toggle
   - Close dropdown (<details>) on outside click / Escape / selection
   - Footer year
   - Contact form prefill (from URL)
   - Formspree submit handler (forces on-site thank-you redirect)
   ========================================================= */

(() => {
  "use strict";

  /* -------------------------
     Helpers
  ------------------------- */
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -------------------------
     GA4 (optional)
  ------------------------- */
  const initGA4 = () => {
    const idRaw = (window.GA4_MEASUREMENT_ID || "").toString().trim();
    const valid = /^G-[A-Z0-9]{6,}$/i.test(idRaw);
    if (!valid) return;

    if (window.__ga4_initialized) return;
    window.__ga4_initialized = true;

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(idRaw)}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", idRaw, { anonymize_ip: true });
  };

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
    ) return false;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return false;
    }
    return url.origin !== window.location.origin;
  };

  /* -------------------------
     Sticky header offset + anchor scrolling
  ------------------------- */
  const initStickyAnchorOffset = () => {
    const header = qs(".site-header");
    if (!header) return;

    const setHeaderOffset = () => {
      const h = Math.ceil(header.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty("--header-offset", `${h}px`);
    };

    const scrollToHash = (hash, smooth = true) => {
      if (!hash) return;
      let sel;
      try {
        sel = decodeURIComponent(hash);
      } catch {
        sel = hash;
      }
      const el = qs(sel);
      if (!el) return;

      // let layout settle; ensures header height is correct
      requestAnimationFrame(() => {
        setHeaderOffset();
        const offset =
          parseInt(
            getComputedStyle(document.documentElement)
              .getPropertyValue("--header-offset"),
            10
          ) || 0;

        const y = el.getBoundingClientRect().top + window.pageYOffset - offset - 16;

        window.scrollTo({
          top: y,
          behavior: smooth ? "smooth" : "auto",
        });
      });
    };

    setHeaderOffset();
    window.addEventListener("resize", setHeaderOffset);
    window.addEventListener("orientationchange", setHeaderOffset);

    // On initial load with hash
    if (window.location.hash) {
      scrollToHash(window.location.hash, false);
    }

    // Handle ALL in-page anchors so they don't hide under sticky header
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (!a) return;

      const href = a.getAttribute("href") || "";
      const hasHash = href.includes("#");
      if (!hasHash) return;

      // Determine if link targets same page
      const [pathPart, hashPart] = href.split("#");
      const hash = "#" + (hashPart || "");
      if (!hash || hash === "#") return;

      const currentFile = window.location.pathname.split("/").pop() || "";
      const isSamePage =
        pathPart === "" ||
        pathPart === currentFile ||
        pathPart.endsWith("/" + currentFile);

      // allow services.html#... from other pages too
      const isSameOriginTarget = (() => {
        try {
          const url = new URL(href, window.location.href);
          return url.origin === window.location.origin;
        } catch {
          return false;
        }
      })();

      if (!isSameOriginTarget) return;

      // If it's another page + hash, let browser navigate normally.
      // Example: from index.html clicking services.html#tools-resources should navigate.
      if (!isSamePage && pathPart !== "") return;

      // Same page hash: prevent default jump; do our offset scroll
      e.preventDefault();
      history.pushState(null, "", hash);
      scrollToHash(hash, true);

      // Close any open dropdown details after selection
      const openDetails = a.closest("details[open]");
      if (openDetails) openDetails.removeAttribute("open");

      // Close mobile nav if open
      const navLinks = qs("[data-nav-links]");
      const navToggle = qs("[data-nav-toggle]");
      if (navLinks && navLinks.classList.contains("is-open")) {
        navLinks.classList.remove("is-open");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
      }
    });

    // If user uses back/forward and hash changes
    window.addEventListener("popstate", () => {
      if (window.location.hash) scrollToHash(window.location.hash, false);
    });
  };

  /* -------------------------
     Nav toggle + dropdown close behaviors
 ------------------------- */
  const initNav = () => {
    const navToggle = qs("[data-nav-toggle]");
    const navLinks = qs("[data-nav-links]");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;

        // close mobile nav
        if (navLinks.classList.contains("is-open")) {
          navLinks.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        }

        // close any open dropdown
        const dd = qs("details.nav-dropdown[open]");
        if (dd) dd.removeAttribute("open");
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      const openDd = qs("details.nav-dropdown[open]");
      if (!openDd) return;
      if (e.target.closest("details.nav-dropdown")) return;
      openDd.removeAttribute("open");
    });
  };

  /* -------------------------
     Footer year
 ------------------------- */
  const initYear = () => {
    const yearEl = qs("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  };

  /* -------------------------
     Contact form prefill (from URL)
     Example: contact.html?interest=community
 ------------------------- */
  const initContactPrefill = () => {
    const onContact =
      /contact\.html$/i.test(window.location.pathname.split("/").pop() || "");
    if (!onContact) return;

    const params = new URLSearchParams(window.location.search);
    const interest = (params.get("interest") || "").trim();
    if (!interest) return;

    const select = qs('select[name="interest"]');
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
  };

  /* -------------------------
     Formspree submit handler
     Forces redirect to on-site thank-you page.
 ------------------------- */
  const initFormspree = () => {
    const onContact =
      /contact\.html$/i.test(window.location.pathname.split("/").pop() || "");
    if (!onContact) return;

    const form = qs('form[action*="formspree.io/f/"]');
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const action = form.getAttribute("action");
      const method = (form.getAttribute("method") || "POST").toUpperCase();

      const nextInput = qs('input[name="_next"]', form);
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
  };

  /* -------------------------
     Single click handler for analytics + outbound
 ------------------------- */
  const initClickTracking = () => {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");

      // Outbound link tracking
      if (a && isOutboundLink(a)) {
        if (!a.hasAttribute("data-track")) {
          const href = a.getAttribute("href") || "";
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

      // Any element with data-track
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
  };

  /* -------------------------
     Boot
 ------------------------- */
  initGA4();

  onReady(() => {
    initStickyAnchorOffset();
    initNav();
    initYear();
    initContactPrefill();
    initFormspree();
    initClickTracking();
  });
})();
