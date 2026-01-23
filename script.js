/* =========================================================
   The Reclamation Co. / Soul Stone Inc. — Base Scripts (FIXED)
   - Optional GA4 loader (set window.GA4_MEASUREMENT_ID in HTML)
   - GA click tracking (data-track / data-label)
   - Outbound link tracking (no double-fire)
   - Sticky header anchor offset (no hidden section titles)
   - Mobile nav toggle
   - Close dropdown (<details>) on outside click / Escape / selection
   - Footer year
   - Contact form prefill (from URL)
   - Formspree submit handler (forces on-site thank-you redirect)
   - Reveal-on-scroll (calm motion; respects prefers-reduced-motion)
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

  const currentFile = () => window.location.pathname.split("/").pop() || "";

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

      // Let layout settle; ensures correct header height
      requestAnimationFrame(() => {
        setHeaderOffset();

        const offset =
          parseInt(
            getComputedStyle(document.documentElement)
              .getPropertyValue("--header-offset")
              .trim(),
            10
          ) || 0;

        // THIS controls “how close” you land under the header:
        // smaller number = closer to header (but still visible)
        const breathingRoom = 6;

        const y =
          el.getBoundingClientRect().top +
          window.pageYOffset -
          offset -
          breathingRoom;

        window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
      });
    };

    setHeaderOffset();
    window.addEventListener("resize", setHeaderOffset);
    window.addEventListener("orientationchange", setHeaderOffset);

    // On initial load with hash
    if (window.location.hash) {
      // Slight delay helps prevent “land too low” on load
      setTimeout(() => scrollToHash(window.location.hash, false), 0);
    }

    // Handle SAME-PAGE in-page anchors (offset scroll)
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href*="#"]');
      if (!a) return;

      const href = (a.getAttribute("href") || "").trim();
      if (!href.includes("#")) return;

      // Only handle same-origin
      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const hash = url.hash || "";
      if (!hash || hash === "#") return;

      const targetFile = (url.pathname.split("/").pop() || "").trim();
      const thisFile = currentFile();

      // If it’s another page + hash, let browser navigate normally.
      // Example: index.html -> our-work.html#tools-resources
      const isSamePage = targetFile === "" || targetFile === thisFile;
      if (!isSamePage) return;

      // Same page hash: prevent default jump; do our offset scroll
      e.preventDefault();
      history.pushState(null, "", hash);
      scrollToHash(hash, true);

      // Close open dropdown details after selection
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

    // Back/forward hash changes
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
    if (!navToggle || !navLinks) return;

    // Mobile toggle
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close mobile nav + dropdown when clicking any nav link (FIRST CLICK NAVIGATES)
    navLinks.addEventListener("click", (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;

      // Close any open dropdown <details>
      const openDd = qs("details.nav-dropdown[open]");
      if (openDd) openDd.removeAttribute("open");

      // Close mobile menu
      if (navLinks.classList.contains("is-open")) {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }

      // IMPORTANT: do NOT preventDefault here
      // Browser navigates immediately on first click.
    });

    // Escape closes menus
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;

      if (navLinks.classList.contains("is-open")) {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }

      const dd = qs("details.nav-dropdown[open]");
      if (dd) dd.removeAttribute("open");
    });

    // Click outside closes dropdown
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
  const raw = (params.get("interest") || params.get("topic") || "").trim();
  if (!raw) return;

  const select = qs('select[name="interest"]');
  if (!select) return;

  const desired = raw.toLowerCase();

  // Alias map (so links can stay human-friendly)
  const aliases = {
    donate: "donation",
    giving: "donation",
    donation: "donation",
    volunteer: "volunteer",
    volunteers: "volunteer",
    partnership: "partnership",
    partner: "partnership",
    updates: "updates",
    newsletter: "updates",
    email: "updates",
    general: "general",
    contact: "general",
  };

  const normalized = aliases[desired] || desired;

  // 1) Match by option VALUE
  let matched = false;
  for (const opt of Array.from(select.options)) {
    if ((opt.value || "").toLowerCase() === normalized) {
      opt.selected = true;
      matched = true;
      break;
    }
  }

  // 2) Fallback: match by visible text (contains)
  if (!matched) {
    for (const opt of Array.from(select.options)) {
      const text = (opt.textContent || "").toLowerCase();
      if (text.includes(normalized)) {
        opt.selected = true;
        matched = true;
        break;
      }
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
    const onContact = /contact\.html$/i.test(currentFile());
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

        track("contact_submit_error", "contact_form_error", {
          status: res.status,
        });
        form.submit();
      } catch {
        track("contact_submit_error", "contact_form_error_network");
        form.submit();
      }
    });
  };

  /* -------------------------
     Reveal-on-scroll (calm motion)
  ------------------------- */
  const initReveal = () => {
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targets = Array.from(
      document.querySelectorAll(
        ".card, .hero, .page-hero, .section .h1, .section .h2, .section h2, .section h3"
      )
    );

    if (!targets.length) return;

    targets.forEach((el, idx) => {
      el.classList.add("reveal");
      const delay = Math.min((idx % 6) * 40, 200);
      el.style.setProperty("--reveal-delay", delay + "ms");
      if (reduce) el.classList.add("is-visible");
    });

    if (reduce) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach((el) => io.observe(el));
  };

  /* -------------------------
     Single click handler for analytics + outbound
  ------------------------- */
  const initClickTracking = () => {
    document.addEventListener("click", (e) => {
      // If something already intentionally prevented default (like same-page hash),
      // we still want analytics, but we should NOT re-hijack navigation.
      const defaultPrevented = e.defaultPrevented;

      const a = e.target.closest("a[href]");

      // Outbound link tracking (only hijack navigation if not already prevented)
      if (a && isOutboundLink(a)) {
        if (!a.hasAttribute("data-track")) {
          const href = (a.getAttribute("href") || "").trim();
          track("outbound_click", href);

          const opensNewTab = a.getAttribute("target") === "_blank";
          const hasModifier =
            e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

          if (!defaultPrevented && !opensNewTab && !hasModifier) {
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
    initReveal();
    initYear();
    initContactPrefill();
    initFormspree();
    initClickTracking();
  });
})();
