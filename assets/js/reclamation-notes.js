/* =========================================================
   The Reclamation Co. — Reclamation Notes Feed (Archetype-style)
   Source: Substack RSS (via RSS→JSON bridge for GitHub Pages) + local JSON fallback
   Feed: https://reclamationnotes.substack.com/feed
   Backup: assets/data/reclamation-notes.json
   Renders cards + filters + single-entry reader
   ========================================================= */

(() => {
  "use strict";

  const LIST = document.getElementById("writingList");
  const STATUS = document.getElementById("writingStatus");

  const SHELL = document.querySelector(".writing-shell"); // feed wrapper card
  const READER = document.getElementById("writingReader");
  const BACK = document.getElementById("backToFeed");

  const readerType = document.getElementById("readerType");
  const readerTitle = document.getElementById("readerTitle");
  const readerMeta = document.getElementById("readerMeta");
  const readerBody = document.getElementById("readerBody");

  const chips = Array.from(document.querySelectorAll(".chip[data-filter]"));

  // hard fail if markup is broken
  if (
    !LIST ||
    !STATUS ||
    !SHELL ||
    !READER ||
    !BACK ||
    !readerType ||
    !readerTitle ||
    !readerMeta ||
    !readerBody
  ) {
    console.error("Reclamation Notes page missing required elements.");
    return;
  }

  /* =========================
     Substack feed settings
     ========================= */

  // Substack RSS feed (pattern: /feed)
  const SUBSTACK_FEED = "https://reclamationnotes.substack.com/feed";

  // RSS → JSON bridge so GitHub Pages can fetch reliably (CORS-friendly)
  const RSS2JSON = (feedUrl) =>
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;

  let allEntries = [];
  let currentFilter = "all";

  /* =========================
     Utilities
     ========================= */

  const escapeHTML = (str = "") =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Convert HTML to plain text (safe for our <p> renderer)
  const stripHtml = (html = "") =>
    String(html)
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<\/?[^>]+(>|$)/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const slugFromLink = (link = "") => {
    try {
      const u = new URL(link);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || "entry";
    } catch {
      return link.split("/").filter(Boolean).pop() || "entry";
    }
  };

  const typeFromCategories = (cats = []) => {
    // If she tags posts with: journal / guidance / pattern / letter
    // your filter chips will work automatically.
    const allowed = new Set(["journal", "guidance", "pattern", "letter"]);
    for (const c of cats || []) {
      const t = String(c || "").toLowerCase();
      if (allowed.has(t)) return t;
    }
    return "guidance"; // default
  };

  // Safe minimal renderer:
  // - paragraphs split by blank lines
  // - line breaks preserved
  // - italics *like this*
  const renderBody = (text = "") => {
    const blocks = String(text).trim().split(/\n\s*\n/g);
    return blocks
      .map((b) => {
        const safe = escapeHTML(b).replace(/\*(.+?)\*/g, "<em>$1</em>");
        return `<p>${safe.replace(/\n/g, "<br />")}</p>`;
      })
      .join("");
  };

  const formatTypeLabel = (t) => {
    const map = {
      journal: "JOURNAL",
      guidance: "GUIDANCE",
      pattern: "PATTERN",
      letter: "LETTER",
    };
    const key = String(t || "").toLowerCase();
    return map[key] || (key ? key.toUpperCase() : "ENTRY");
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const setStatus = (msg) => {
    STATUS.textContent = msg || "";
  };

  const setChipActive = (value) => {
    chips.forEach((btn) => {
      const isActive = btn.dataset.filter === value;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  };

  /* =========================
     View state
     ========================= */

  const showReader = (entry) => {
    SHELL.hidden = true;
    READER.hidden = false;

    readerType.textContent = `ENTRY TYPE · ${formatTypeLabel(entry.type)}`;
    readerTitle.textContent = entry.title || "Untitled";
    readerMeta.textContent = entry.date ? formatDate(entry.date) : "";
    readerBody.innerHTML = renderBody(entry.body || "");

    const url = new URL(window.location.href);
    url.searchParams.set("entry", entry.slug);
    history.pushState({ entry: entry.slug }, "", url.toString());

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showFeed = (replaceUrl = true) => {
    READER.hidden = true;
    SHELL.hidden = false;

    if (replaceUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete("entry");
      history.pushState({}, "", url.toString());
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* =========================
     Filtering + rendering
     ========================= */

  const entryMatches = (entry) => {
    if (currentFilter === "all") return true;
    return String(entry.type || "").toLowerCase() === currentFilter;
  };

  const renderList = () => {
    const filtered = allEntries.filter(entryMatches);

    if (!filtered.length) {
      LIST.innerHTML = "";
      setStatus("No entries found for that type.");
      return;
    }

    setStatus("");

    LIST.innerHTML = filtered
      .map((e) => {
        const type = formatTypeLabel(e.type);
        const title = escapeHTML(e.title || "");
        const excerpt = escapeHTML(e.excerpt || "");
        const date = e.date ? formatDate(e.date) : "";
        const slug = escapeHTML(e.slug || "");

        return `
          <article class="card card-pad writing-card" data-slug="${slug}" role="button" tabindex="0" aria-label="Open entry: ${title}">
            <p class="kicker mt-0">ENTRY TYPE</p>
            <h3 class="card-title">${type}</h3>
            ${title ? `<p class="writing-title">${title}</p>` : ""}
            ${excerpt ? `<p class="writing-excerpt">${excerpt}</p>` : ""}
            ${date ? `<p class="help writing-date">${escapeHTML(date)}</p>` : ""}
          </article>
        `;
      })
      .join("");

    LIST.querySelectorAll(".writing-card").forEach((card) => {
      const open = () => {
        const slug = card.getAttribute("data-slug");
        const entry = allEntries.find((x) => x.slug === slug);
        if (entry) showReader(entry);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  };

  /* =========================
     Load entries (Substack → fallback JSON)
     ========================= */

  const loadFromLocalJson = async () => {
    const res = await fetch("assets/data/reclamation-notes.json", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to load backup JSON (${res.status})`);

    const data = await res.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];

    return entries
      .slice()
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  };

  const loadEntries = async () => {
    try {
      setStatus("Loading…");

      // Try Substack first
      const res = await fetch(RSS2JSON(SUBSTACK_FEED), { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load feed (${res.status})`);

      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];

      const substackEntries = items
        .map((it) => {
          const title = it.title || "";
          const bodyText = stripHtml(it.content || it.description || "");
          const excerpt =
            bodyText.length > 180 ? bodyText.slice(0, 180) + "…" : bodyText;

          return {
            slug: slugFromLink(it.link || ""),
            type: typeFromCategories(it.categories),
            date: it.pubDate ? it.pubDate.slice(0, 10) : "",
            title,
            excerpt,
            body: bodyText.replace(/\n{3,}/g, "\n\n"),
          };
        })
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      // If Substack is empty, fall back to local JSON
      allEntries = substackEntries.length ? substackEntries : await loadFromLocalJson();

      setStatus(allEntries.length ? "" : "No notes yet.");
      renderList();

      // Open deep link if present
      const url = new URL(window.location.href);
      const slug = url.searchParams.get("entry");
      if (slug) {
        const entry = allEntries.find((x) => x.slug === slug);
        if (entry) showReader(entry);
      }
    } catch (err) {
      console.error(err);

      // If Substack fails, fall back to local JSON
      try {
        allEntries = await loadFromLocalJson();
        setStatus(allEntries.length ? "" : "No notes yet.");
        renderList();
      } catch (e) {
        console.error(e);
        setStatus("Couldn’t load notes right now.");
      }
    }
  };

  /* =========================
     Events
     ========================= */

  chips.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      setChipActive(currentFilter);
      renderList();
    });
  });

  BACK.addEventListener("click", () => showFeed(true));

  window.addEventListener("popstate", () => {
    const url = new URL(window.location.href);
    const slug = url.searchParams.get("entry");
    if (!slug) return showFeed(false);
    const entry = allEntries.find((x) => x.slug === slug);
    if (entry) showReader(entry);
  });

  loadEntries();
})();
