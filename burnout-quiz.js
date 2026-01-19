/* =========================================================
   Burnout Archetypes Quiz (Soul Survival Quiz)
   - Front-end scoring (5 archetypes)
   - Shows short on-page results
   - Archetype-specific Gumroad CTA URLs (tracking)
   - Primary CTA: Full Archetype Report (lower friction)
   - Secondary CTA: Soul Reset Bundle (higher value upsell)
   - "What you'll get" micro list under CTA
   - Gumroad handles paid delivery (no backend)
   ========================================================= */

(() => {
  "use strict";

  // ====== CONFIG ======
  const QUIZ_FORM_ID = "quizForm";
  const RESULT_ID = "quizResult";
  const DEV_MODE = false;

  // MUST match your <input value="">
  const ARCHETYPES = ["caretaker", "overachiever", "invisible", "overgiver", "chameleon"];

  // ---- Gumroad URLs ----
  // Bundle (live)
  const SOUL_RESET_BUNDLE_BASE = "https://thereclamationco.gumroad.com/l/kiprt";

  // Full Archetype Report (paste the Gumroad link here once created)
  const PAID_ARCHETYPE_BASE = ""; // e.g. "https://thereclamationco.gumroad.com/l/full-archetype-report"

  // Tracking params appended to each CTA
  const buildTrackedUrl = (baseUrl, archetypeKey, offerKey) => {
    if (!baseUrl) return "";
    const u = new URL(baseUrl);
    u.searchParams.set("utm_source", "quiz");
    u.searchParams.set("utm_medium", "results");
    u.searchParams.set("utm_campaign", "soul-survival");
    u.searchParams.set("utm_content", archetypeKey);
    u.searchParams.set("utm_term", offerKey); // archetype_report | bundle
    return u.toString();
  };

  // ----- Short results (FREE) -----
  const SHORT_RESULTS = {
    caretaker: {
      title: "The Caretaker",
      emoji: "🧱",
      snapshot:
        "You survive by holding everything together—often becoming the emotional anchor for everyone else.",
      patterns: [
        "You feel responsible for others’ stability",
        "You default to control because chaos feels unsafe",
        "You minimize your needs until you hit a wall",
      ],
      tip: "Today, let one small thing be “good enough.”",
    },
    overgiver: {
      title: "The Overgiver",
      emoji: "🔥",
      snapshot:
        "You survive by saying yes—overextending to keep connection, approval, or peace.",
      patterns: [
        "You help fast, even when you’re depleted",
        "You feel guilty prioritizing yourself",
        "Resentment builds when your needs stay unmet",
      ],
      tip: "Today, pause before yes—take one full breath before answering any request.",
    },
    invisible: {
      title: "The Invisible One",
      emoji: "🌀",
      snapshot:
        "You survive by disappearing—staying small, quiet, and numb when life feels too much.",
      patterns: [
        "You shut down instead of reaching out",
        "You struggle to name what you need",
        "You feel detached from your own wants or emotions",
      ],
      tip: "Today, ask: “What do I need in the next 10 minutes?” (Keep it tiny.)",
    },
    overachiever: {
      title: "The Overachiever",
      emoji: "⛰",
      snapshot:
        "You survive by pushing and producing—because slowing down feels like falling behind.",
      patterns: [
        "Your worth feels tied to output",
        "Rest triggers self-judgment",
        "You push through exhaustion until your body forces a stop",
      ],
      tip: "Today, pick one task to do at 80%—and stop on purpose.",
    },
    chameleon: {
      title: "The Chameleon Archetype",
      emoji: "🦎",
      snapshot:
        "You survive by adapting—becoming what’s needed to stay safe, liked, or included.",
      patterns: [
        "You shape-shift depending on who you’re with",
        "You second-guess your real preferences",
        "You feel exposed when you’re not “performing”",
      ],
      tip: "Today, say one honest preference out loud—even if it’s small.",
    },
  };

  // Micro-list shown under CTA
  const WHAT_YOU_GET_REPORT = [
    "A “Start Here” page (so you know exactly what to do first)",
    "A full archetype write-up with a clear table of contents",
    "Your core pattern + why it formed (without shame)",
    "Practical reset steps you can start immediately",
  ];

  const WHAT_YOU_GET_BUNDLE = [
    "Everything in the Full Archetype Report",
    "The Soul Reset Guide (your step-by-step roadmap)",
    "Deeper reset tools + integration (the full experience)",
  ];

  // ====== HELPERS ======
  const escapeHtml = (str) =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const getScoresFromForm = (formEl) => {
    const scores = Object.fromEntries(ARCHETYPES.map((k) => [k, 0]));
    const formData = new FormData(formEl);
    for (const val of formData.values()) {
      const key = String(val || "").trim().toLowerCase();
      if (scores[key] !== undefined) scores[key] += 1;
    }
    return scores;
  };

  const getPrimaryAndSecondary = (scores) => {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0]?.[0] || null;
    const primaryScore = sorted[0]?.[1] ?? 0;

    const second = sorted[1]?.[0] || null;
    const secondScore = sorted[1]?.[1] ?? 0;

    let secondary = null;
    if (second && (secondScore === primaryScore || primaryScore - secondScore <= 1)) {
      secondary = second;
    }
    return { primary, secondary };
  };

  const validateAllAnswered = (formEl) => {
    const radios = Array.from(formEl.querySelectorAll('input[type="radio"][name]'));
    const names = [...new Set(radios.map((r) => r.name))];
    for (const name of names) {
      const checked = formEl.querySelector(
        `input[type="radio"][name="${CSS.escape(name)}"]:checked`
      );
      if (!checked) return false;
    }
    return true;
  };

  const scrollToResults = (el) => {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };

  const buildList = (items) => `
    <ul class="what-you-get-list">
      ${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
    </ul>
  `;

  const buildResultHtml = ({ primary, secondary, scores }) => {
    if (!primary || !SHORT_RESULTS[primary]) {
      return `
        <div class="quiz-result-card">
          <h2>Something didn’t score correctly.</h2>
          <p>Please make sure you answered every question, then try again.</p>
        </div>
      `;
    }

    const p = SHORT_RESULTS[primary];

    const reportUrl = buildTrackedUrl(PAID_ARCHETYPE_BASE, primary, "archetype_report");
    const bundleUrl = buildTrackedUrl(SOUL_RESET_BUNDLE_BASE, primary, "bundle");

    const hasReport = !!PAID_ARCHETYPE_BASE;
    const hasBundle = !!SOUL_RESET_BUNDLE_BASE;

    const goToLine = `When you unlock the full program, go straight to <strong>${escapeHtml(
      p.title
    )}</strong> section first.`;

    const secondaryHtml =
      secondary && SHORT_RESULTS[secondary]
        ? (() => {
            const s = SHORT_RESULTS[secondary];
            return `
              <div class="quiz-secondary">
                <p><strong>Secondary pattern:</strong> ${escapeHtml(s.emoji)} ${escapeHtml(
              s.title
            )}</p>
                <p class="muted">This may show up in certain environments, seasons, or relationships.</p>
              </div>
            `;
          })()
        : "";

    const scoreLine = ARCHETYPES.map((k) => {
      const label = SHORT_RESULTS[k]?.title || k;
      const emoji = SHORT_RESULTS[k]?.emoji || "";
      const n = scores[k] ?? 0;
      return `<span class="pill">${escapeHtml(emoji)} ${escapeHtml(label)}: ${n}</span>`;
    }).join(" ");

    // CTA block logic:
    // - If report exists, make it primary + bundle as upsell
    // - If report doesn't exist yet, bundle is primary (temporary)
    const ctaHtml = (() => {
      if (hasReport && hasBundle) {
        return `
          <div class="quiz-cta">
            <a class="btn-primary" href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener">
              Unlock the Full Archetype Report
            </a>
            <div class="micro">
              <p class="muted"><strong>What you’ll get:</strong></p>
              ${buildList(WHAT_YOU_GET_REPORT)}
            </div>

            <div class="upsell">
              <p class="muted"><strong>Want the full reset experience?</strong></p>
              <a class="btn-outline" href="${escapeHtml(bundleUrl)}" target="_blank" rel="noopener">
                Upgrade to the Soul Reset Bundle
              </a>
              <div class="micro">
                ${buildList(WHAT_YOU_GET_BUNDLE)}
              </div>
            </div>
          </div>
        `;
      }

if (hasBundle) {
  return `
    <div class="quiz-cta">
      <a class="btn-primary" href="${escapeHtml(bundleUrl)}" target="_blank" rel="noopener">
        Unlock the Soul Reset Bundle
      </a>
      <div class="micro">
        <p class="muted"><strong>What you’ll get:</strong></p>
        ${buildList(WHAT_YOU_GET_BUNDLE)}
      </div>
    </div>
  `;
}


      return `
        <div class="quiz-cta">
          <p class="muted">Paid links not configured yet.</p>
        </div>
      `;
    })();

    return `
      <div class="quiz-result-card">
        <h2>Your Soul Survival Archetype: ${escapeHtml(p.emoji)} ${escapeHtml(p.title)}</h2>
        <p class="quiz-snapshot">${escapeHtml(p.snapshot)}</p>

        <h3>What this looks like right now:</h3>
        <ul class="quiz-patterns">
          ${p.patterns.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
        </ul>

        <p class="quiz-tip"><strong>One gentle reset:</strong> ${escapeHtml(p.tip)}</p>

        ${secondaryHtml}

        <div class="quiz-program-nudge">
          <p>${goToLine}</p>
        </div>

        ${ctaHtml}

        <div class="quiz-scoreline" aria-label="Your score breakdown">
          ${scoreLine}
        </div>

        <p class="muted small">
          Note: This quiz is a reflection tool, not a diagnosis. Take what resonates and leave the rest.
        </p>
      </div>
    `;
  };

  // ====== INIT ======
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  onReady(() => {
    const form = document.getElementById(QUIZ_FORM_ID);
    const result = document.getElementById(RESULT_ID);
    if (!form || !result) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!validateAllAnswered(form)) {
        result.innerHTML = `
          <div class="quiz-result-card">
            <h2>Almost there.</h2>
            <p>Please answer every question so your archetype can score accurately.</p>
          </div>
        `;
        scrollToResults(result);
        return;
      }

      const scores = getScoresFromForm(form);
      const { primary, secondary } = getPrimaryAndSecondary(scores);

      try {
        localStorage.setItem(
          "soulSurvivalQuiz:lastResult",
          JSON.stringify({ primary, secondary, scores, ts: Date.now() })
        );
      } catch {}

      result.innerHTML = buildResultHtml({ primary, secondary, scores });
      scrollToResults(result);

      // Optional GA4 event tracking
      if (window.gtag) {
        try {
          window.gtag("event", "quiz_completed", {
            event_category: "engagement",
            event_label: primary || "unknown",
          });
        } catch {}
      }
    });
  });
})();
