/* =========================================================
   The Reclamation Co. — Reclamation Notes Feed (Unified)
   Priority:
     1) Substack RSS (via rss2json bridge)
     2) GitHub content repo (Netlify CMS-style markdown)
     3) Local JSON fallback

   Local JSON expected: /assets/data/reclamation-notes.json  (or change path below)
   ========================================================= */

(() => {
  "use strict";

  const LIST = document.getElementById("writingList");
  const STATUS = document.getElementById("writingStatus");

  const SHELL = document.querySelector(".writing-shell");
  const READER = document.getElementById("writingReader");
  const BACK = document.getElementById("backToFeed");

  const readerType = document.getElementById("readerType");
  const readerTitle = document.getElementById("readerTitle");
  const readerMeta = document.getElementById("readerMeta");
  const readerBody = document.getElementById("readerBody");

  const chips = Array.from(document.querySelectorAll(".chip[data-filter]"));

  if (
    !LIST || !STATUS || !SHELL || !READER || !BACK ||
    !readerType || !readerTitle || !readerMeta || !readerBody
  ) {
    console.error("Reclamation Notes page missing required elements.");
    return;
  }

  /* =========================
     SOURCE SETTINGS
     ========================= */

  // 1) Substack (primary)
  const SUBSTACK_FEED = "https://soulstoneinc.substack.com/feed";
  const RSS2JSON = (feedUrl) =>
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;

  // 2) GitHub content repo (secondary / Netlify CMS output)
  // If you don’t want this at all, set ENABLE_GITHUB_SOURCE = false
  const ENABLE_GITHUB_SOURCE = true;
  const GH_OWNER = "Kmarie85";
  const GH_REPO = "reclamation-notes-content";
  const GH_FOLDER = "notes"; // repo folder containing .md files

  // 3) Local JSON (last resort)
  // IMPORTANT: Make sure this matches your real file path.
  const LOCAL_JSON_PATH = "assets/data/reclamation-notes.json";
  // If your file is actually /data/reclamation-notes.json, use:
  // const LOCAL_JSON_PATH = "data/reclamation-notes.json";

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
    const allowed = new Set(["journal", "guidance", "pattern", "letter"]);
    for (const c of cats || []) {
      const t = String(c || "").toLowerCase();
      if (allowed.has(t)) return t;
    }
    return "guidance";
  };

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

  const setStatus = (msg) => (STATUS.textContent = msg || "");

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
     LOADERS
     ========================= */

  const loadFromLocalJson = async () => {
    const res = await fetch(LOCAL_JSON_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load local JSON (${res.status})`);

    const data = await res.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return entries
      .slice()
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  };

  const loadFromSubstack = async () => {
    const res = await fetch(RSS2JSON(SUBSTACK_FEED), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load Substack (${res.status})`);

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    return items
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
  };

  // GitHub repo markdown loader (Netlify CMS output)
  const parseFrontmatter = (md) => {
    const fm = md.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
    if (!fm) return { data: {}, body: md };

    const raw = fm[1];
    const body = fm[2];

    const data = {};
    raw.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      val = val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      data[key] = val;
    });

    return { data, body };
  };

  const loadFromGithubRepo = async () => {
    if (!ENABLE_GITHUB_SOURCE) return [];

    const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FOLDER}`;
    const res = await fetch(api, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed GitHub contents (${res.status})`);

    const files = await res.json();
    const mdFiles = (Array.isArray(files) ? files : [])
      .filter((f) => f.type === "file" && f.name.toLowerCase().endsWith(".md"))
      .sort((a, b) => b.name.localeCompare(a.name));

    if (!mdFiles.length) return [];

    const loaded = [];
    for (const f of mdFiles) {
      const t = await fetch(f.download_url, { cache: "no-store" });
      if (!t.ok) continue;
      const md = await t.text();

      const { data, body } = parseFrontmatter(md);
      const cleanBody = stripHtml(body); // keep your safe paragraph renderer

      const excerpt =
        (data.excerpt || "").trim() ||
        (cleanBody.length > 180 ? cleanBody.slice(0, 180) + "…" : cleanBody);

      loaded.push({
        slug: f.name.replace(/\.md$/i, ""),
        type: String(data.type || "journal").toLowerCase(),
        date: data.date ? String(data.date).slice(0, 10) : "",
        title: data.title || f.name.replace(/\.md$/i, ""),
        excerpt,
        body: cleanBody.replace(/\n{3,}/g, "\n\n"),
      });
    }

    loaded.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return loaded;
  };

  const openDeepLinkIfPresent = () => {
    const url = new URL(window.location.href);
    const slug = url.searchParams.get("entry");
    if (!slug) return;
    const entry = allEntries.find((x) => x.slug === slug);
    if (entry) showReader(entry);
  };

  const loadEntries = async () => {
    setStatus("Loading…");

    // 1) Substack
    try {
      const sub = await loadFromSubstack();
      if (sub.length) {
        allEntries = sub;
        setStatus("");
        renderList();
        openDeepLinkIfPresent();
        return;
      }
    } catch (e) {
      console.warn("Substack failed:", e);
    }

    // 2) GitHub repo markdown (optional)
    try {
      const gh = await loadFromGithubRepo();
      if (gh.length) {
        allEntries = gh;
        setStatus("");
        renderList();
        openDeepLinkIfPresent();
        return;
      }
    } catch (e) {
      console.warn("GitHub repo failed:", e);
    }

    // 3) Local JSON
    try {
      const local = await loadFromLocalJson();
      allEntries = local;
      setStatus(allEntries.length ? "" : "No notes yet.");
      renderList();
      openDeepLinkIfPresent();
    } catch (e) {
      console.error("Local JSON failed:", e);
      setStatus("Couldn’t load notes right now.");
      LIST.innerHTML = "";
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

  setChipActive("all");
  loadEntries();
})();
