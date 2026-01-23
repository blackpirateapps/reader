import React, { useEffect, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);

const API_LIBRARY = "/api/library";
const API_FEEDS = "/api/feeds";
const PAGE_SIZE = 20;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

function setCookie(name, value) {
  const date = new Date();
  date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
}

function readSetting(key, fallback) {
  return localStorage.getItem(key) || getCookie(key) || fallback;
}

function writeSetting(key, value) {
  localStorage.setItem(key, value);
  setCookie(key, value);
}

function applySettings(settings) {
  const root = document.documentElement;
  root.setAttribute("data-theme", settings.theme);
  root.style.setProperty(
    "--reader-font-family",
    settings.font === "serif" ? "var(--font-serif)" : "var(--font-sans)"
  );
  root.style.setProperty("--reader-font-weight", settings.weight);
  root.style.setProperty("--reader-font-size", `${settings.size}px`);
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) {
    return { path: "/", query: new URLSearchParams() };
  }
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return { path, query: new URLSearchParams(queryPart || "") };
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "#/";
    }
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  function navigate(path, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    window.location.hash = queryString ? `#${path}?${queryString}` : `#${path}`;
  }

  return [route, navigate];
}

async function callApi({ endpoint, type, method = "GET", body, query = {}, authKey, onUnauthorized }) {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set("type", type);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-auth-key": authKey || "",
    },
    body: method === "GET" ? null : JSON.stringify({ ...body, type }),
  });

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    return null;
  }

  try {
    return await res.json();
  } catch (error) {
    return null;
  }
}

function useSettings() {
  const [settings, setSettings] = useState(() => ({
    theme: readSetting("cr_theme", "frost"),
    font: readSetting("cr_font", "serif"),
    weight: readSetting("cr_weight", "400"),
    size: Number(readSetting("cr_size", "18")),
  }));

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  function updateSetting(key, value) {
    const storageKey = `cr_${key}`;
    writeSetting(storageKey, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return [settings, updateSetting];
}

function App() {
  const [route, navigate] = useHashRoute();
  const [settings, updateSetting] = useSettings();
  const [authKey, setAuthKey] = useState(localStorage.getItem("clean_reader_key") || "");

  function login(key) {
    localStorage.setItem("clean_reader_key", key);
    setAuthKey(key);
  }

  function logout() {
    localStorage.removeItem("clean_reader_key");
    setAuthKey("");
    navigate("/");
  }

  if (!authKey) {
    return html`<${Login} onSubmit=${login} />`;
  }

  return html`
    <div class="app-shell">
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-orb orb-3"></div>
      <div class="app-inner">
        <${TopBar} route=${route} navigate=${navigate} logout=${logout} />
        <${MainView}
          route=${route}
          navigate=${navigate}
          authKey=${authKey}
          settings=${settings}
          updateSetting=${updateSetting}
          onAuthFail=${logout}
        />
      </div>
    </div>
  `;
}

function TopBar({ route, navigate, logout }) {
  const links = [
    { path: "/", label: "Library" },
    { path: "/feeds", label: "Feeds" },
    { path: "/highlights", label: "Highlights" },
    { path: "/settings", label: "Settings" },
  ];
  const activePath = route.path === "/reader" ? "/" : route.path;

  return html`
    <header class="topbar glass">
      <div class="brand">
        <div class="brand-title">Clean Reader</div>
        <div class="brand-sub">Private reading vault</div>
      </div>
      <nav class="top-nav">
        ${links.map(
          (link) => html`
            <button
              class=${activePath === link.path ? "active" : ""}
              onClick=${() => navigate(link.path)}
            >
              ${link.label}
            </button>
          `
        )}
      </nav>
      <div class="top-actions">
        <span class="pill">Key saved</span>
        <button class="btn ghost" onClick=${logout}>Log out</button>
      </div>
    </header>
  `;
}

function MainView({ route, navigate, authKey, settings, updateSetting, onAuthFail }) {
  switch (route.path) {
    case "/reader":
      return html`
        <${ReaderView}
          route=${route}
          navigate=${navigate}
          authKey=${authKey}
          onAuthFail=${onAuthFail}
        />
      `;
    case "/feeds":
      return html`<${FeedsView} authKey=${authKey} onAuthFail=${onAuthFail} />`;
    case "/highlights":
      return html`<${HighlightsView} authKey=${authKey} onAuthFail=${onAuthFail} navigate=${navigate} />`;
    case "/settings":
      return html`<${SettingsView} settings=${settings} updateSetting=${updateSetting} />`;
    default:
      return html`
        <${LibraryView}
          authKey=${authKey}
          navigate=${navigate}
          onAuthFail=${onAuthFail}
        />
      `;
  }
}

function Login({ onSubmit }) {
  const [key, setKey] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (key.trim()) {
      onSubmit(key.trim());
    }
  }

  return html`
    <div class="app-shell">
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-orb orb-3"></div>
      <div class="login-shell">
        <form class="glass login-card" onSubmit=${handleSubmit}>
          <p class="login-title">Clean Reader</p>
          <p class="login-sub">Enter your key to unlock the glass library.</p>
          <input
            class="input"
            type="password"
            placeholder="Access key"
            value=${key}
            onInput=${(event) => setKey(event.target.value)}
          />
          <button class="btn primary" type="submit">Enter Library</button>
        </form>
      </div>
    </div>
  `;
}

function LibraryView({ authKey, navigate, onAuthFail }) {
  const [view, setView] = useState("inbox");
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hnIds, setHnIds] = useState([]);
  const [hnPage, setHnPage] = useState(0);
  const [hnItems, setHnItems] = useState([]);
  const [hnLoading, setHnLoading] = useState(false);

  async function libraryApi(type, options = {}) {
    return callApi({
      endpoint: API_LIBRARY,
      type,
      authKey,
      onUnauthorized: onAuthFail,
      ...options,
    });
  }

  useEffect(() => {
    if (view === "hn") return;
    if (searchQuery.length >= 2) return;
    loadList();
  }, [view]);

  useEffect(() => {
    if (view !== "hn") return;
    loadHN();
  }, [view, hnPage]);

  useEffect(() => {
    if (view === "hn") return;
    if (searchQuery.length < 2) {
      if (searchQuery.length === 0) loadList();
      return;
    }
    const timer = setTimeout(async () => {
      const data = await libraryApi("search", {
        query: { q: searchQuery },
      });
      setArticles(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, view]);

  async function loadList() {
    setLoading(true);
    const data = await libraryApi("list", {
      query: { archived: view === "archive" },
    });
    setArticles(data || []);
    setLoading(false);
  }

  async function loadHN() {
    setHnLoading(true);
    try {
      let ids = hnIds;
      if (ids.length === 0) {
        const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
        ids = await res.json();
        setHnIds(ids || []);
      }
      const start = hnPage * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const slice = (ids || []).slice(start, end);
      const stories = await Promise.all(
        slice.map((id) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json()))
      );
      setHnItems(stories.filter(Boolean));
    } catch (error) {
      setHnItems([]);
    }
    setHnLoading(false);
  }

  async function saveUrl(url) {
    if (!url) return;
    setStatus("Saving article...");
    const res = await libraryApi("save", {
      method: "POST",
      body: { url },
    });
    if (res && res.success) {
      setStatus("Saved.");
      setUrlInput("");
      if (view === "inbox") loadList();
    } else {
      setStatus("Error saving.");
    }
    setTimeout(() => setStatus(""), 3000);
  }

  async function updateArchive(id, action) {
    await libraryApi("archive", {
      method: "POST",
      body: { id, action },
    });
    loadList();
  }

  async function deleteArticle(id) {
    if (!confirm("Delete permanently?")) return;
    await libraryApi("delete", {
      method: "POST",
      body: { id },
    });
    loadList();
  }

  async function saveFromHN(item) {
    if (!item || !item.url) return;
    const res = await libraryApi("save", {
      method: "POST",
      body: { url: item.url, hn_id: item.id },
    });
    if (res && res.success && res.id) {
      navigate("/reader", { id: res.id, hn_id: item.id });
    }
  }

  const maxPage = Math.max(0, Math.ceil(hnIds.length / PAGE_SIZE) - 1);

  return html`
    <section class="glass section animate-in">
      <div>
        <h1 class="section-title">Library</h1>
        <p class="section-sub">Capture links, browse your archive, or pull fresh Hacker News picks.</p>
      </div>
      <div class="input-row">
        <input
          class="input"
          type="url"
          placeholder="Paste an article URL"
          value=${urlInput}
          onInput=${(event) => setUrlInput(event.target.value)}
        />
        <button class="btn primary" onClick=${() => saveUrl(urlInput)}>Save</button>
      </div>
      ${view !== "hn"
        ? html`
            <div class="input-row">
              <input
                class="input"
                type="search"
                placeholder="Search your library"
                value=${searchQuery}
                onInput=${(event) => setSearchQuery(event.target.value)}
              />
            </div>
          `
        : null}
      <div class="status">${status}</div>
      <div class="segmented" role="tablist">
        ${["inbox", "hn", "archive"].map((tab) => {
          const label = tab === "hn" ? "Hacker News" : tab === "inbox" ? "Reading" : "Archive";
          return html`
            <button
              class=${view === tab ? "active" : ""}
              onClick=${() => {
                setView(tab);
                setSearchQuery("");
                if (tab === "hn") setHnPage(0);
              }}
            >
              ${label}
            </button>
          `;
        })}
      </div>
    </section>
    <section class="glass section animate-in" style=${{ animationDelay: "0.1s" }}>
      ${view === "hn"
        ? html`
            <div class="status">${hnLoading ? "Loading Hacker News..." : "Top stories"}</div>
            <ul class="list">
              ${hnItems.length === 0 && !hnLoading
                ? html`<li class="list-item">No stories loaded.</li>`
                  : hnItems.map((item, index) => {
                    const domain = item.url ? new URL(item.url).hostname.replace("www.", "") : "news.ycombinator.com";
                    return html`
                      <li
                        key=${item.id || index}
                        class="list-item animate-in"
                        style=${{ animationDelay: `${index * 0.03}s` }}
                      >
                        <div>
                          <p class="list-title">${item.title}</p>
                          <div class="list-meta">
                            ${item.score || 0} points | ${item.by || ""} | ${domain}
                          </div>
                        </div>
                        <div class="list-actions">
                          ${item.url
                            ? html`<button class="btn secondary" onClick=${() => window.open(item.url, "_blank")}>Open</button>`
                            : null}
                          ${item.url
                            ? html`<button class="btn primary" onClick=${() => saveFromHN(item)}>Save and Read</button>`
                            : null}
                        </div>
                      </li>
                    `;
                  })}
            </ul>
            <div class="pagination">
              <button class="btn ghost" onClick=${() => setHnPage(Math.max(0, hnPage - 1))}>Prev</button>
              <span>Page ${hnPage + 1}</span>
              <button class="btn ghost" onClick=${() => setHnPage(Math.min(maxPage, hnPage + 1))}>Next</button>
            </div>
          `
        : html`
            ${loading
              ? html`<div class="status">Loading articles...</div>`
              : html`
                  <ul class="list">
                    ${articles.length === 0
                      ? html`<li class="list-item">No articles found.</li>`
                      : articles.map((item, index) => html`
                          <li
                            key=${item.id || index}
                            class="list-item animate-in"
                            style=${{ animationDelay: `${index * 0.02}s` }}
                          >
                            <div>
                              <p class="list-title">${item.title}</p>
                              <div class="list-meta">
                                ${new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                | ${new URL(item.url).hostname.replace("www.", "")}
                              </div>
                            </div>
                            <div class="list-actions">
                              <button class="btn secondary" onClick=${() => navigate("/reader", { id: item.id })}>Read</button>
                              <button
                                class="btn ghost"
                                onClick=${() =>
                                  updateArchive(item.id, view === "archive" ? "unarchive" : "archive")
                                }
                              >
                                ${view === "archive" ? "Unarchive" : "Archive"}
                              </button>
                              <button class="btn ghost" onClick=${() => deleteArticle(item.id)}>Delete</button>
                            </div>
                          </li>
                        `)}
                  </ul>
                `}
          `}
    </section>
  `;
}

function ReaderView({ route, navigate, authKey, onAuthFail }) {
  const articleId = route.query.get("id");
  const paramHnId = route.query.get("hn_id");
  const [article, setArticle] = useState(null);
  const [contentHtml, setContentHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [highlightBtn, setHighlightBtn] = useState({ visible: false, x: 0, y: 0 });
  const [noteToast, setNoteToast] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const selectionRef = useRef({ text: "", range: null });
  const articleRef = useRef(null);

  async function libraryApi(type, options = {}) {
    return callApi({
      endpoint: API_LIBRARY,
      type,
      authKey,
      onUnauthorized: onAuthFail,
      ...options,
    });
  }

  useEffect(() => {
    if (!articleId) return;
    loadArticle();
  }, [articleId]);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setHighlightBtn((prev) => ({ ...prev, visible: false }));
        return;
      }
      const range = selection.getRangeAt(0);
      if (!articleRef.current || !articleRef.current.contains(range.commonAncestorContainer)) {
        setHighlightBtn((prev) => ({ ...prev, visible: false }));
        return;
      }
      const rect = range.getBoundingClientRect();
      selectionRef.current = { text: selection.toString(), range };
      setHighlightBtn({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 12,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  async function loadArticle() {
    setLoading(true);
    const data = await libraryApi("read", { query: { id: articleId } });
    if (data) {
      setArticle(data);
      setContentHtml(data.content || "");
      const highlightData = await libraryApi("get_highlights", {
        query: { article_id: articleId },
      });
      const highlightList = highlightData || [];
      setContentHtml(applyHighlights(data.content || "", highlightList));
      const finalHnId = paramHnId || data.hn_id;
      if (finalHnId) {
        loadHNComments(finalHnId);
      }
    }
    setLoading(false);
  }

  function applyHighlights(content, items) {
    let updated = content;
    items.forEach((item) => {
      if (updated.includes(item.quote)) {
        const noteText = item.note || "";
        const safeNote = noteText.replace(/"/g, "&quot;");
        const mark = `<mark class=\"highlight-mark\" data-note=\"${safeNote}\">${item.quote}</mark>`;
        updated = updated.replace(item.quote, mark);
      }
    });
    return updated;
  }

  async function addHighlight() {
    const selection = selectionRef.current;
    if (!selection.text) return;

    try {
      const mark = document.createElement("mark");
      mark.className = "highlight-mark";
      mark.dataset.note = noteValue || "";
      mark.title = noteValue || "";
      selection.range.surroundContents(mark);
      if (articleRef.current) {
        setContentHtml(articleRef.current.innerHTML);
      }
    } catch (error) {
      // Ignore complex selections.
    }

    await libraryApi("add_highlight", {
      method: "POST",
      body: { article_id: articleId, quote: selection.text, note: noteValue },
    });

    setNoteValue("");
    setNoteOpen(false);
    window.getSelection().removeAllRanges();
  }

  function handleArticleClick(event) {
    const target = event.target;
    if (target.tagName === "MARK") {
      const note = target.dataset.note || "No note";
      setNoteToast(note);
      setTimeout(() => setNoteToast(""), 2400);
    }
  }

  async function loadHNComments(hnId) {
    setCommentsLoading(true);
    try {
      const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${hnId}.json`);
      const story = await storyRes.json();
      if (!story || !story.kids || story.kids.length === 0) {
        setComments([]);
        setCommentsLoading(false);
        return;
      }
      const kids = story.kids.slice(0, 20);
      const list = await Promise.all(
        kids.map((id) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json()))
      );
      setComments(list.filter(Boolean));
    } catch (error) {
      setComments([]);
    }
    setCommentsLoading(false);
  }

  if (!articleId) {
    return html`<section class="glass section">Missing article id.</section>`;
  }

  if (loading) {
    return html`<section class="glass section">Loading article...</section>`;
  }

  if (!article) {
    return html`<section class="glass section">Article not found.</section>`;
  }

  const textContent = stripHtml(contentHtml);
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 220));

  return html`
    <section class="glass section animate-in">
      <div class="reader-toolbar">
        <button class="btn ghost" onClick=${() => navigate("/")}>Back to Library</button>
        <button class="btn ghost" onClick=${() => navigate("/settings")}>Reader Settings</button>
        <button class="btn secondary" onClick=${() => window.open(article.url, "_blank")}>Open Original</button>
      </div>
      <div class="reader-header">
        <div>
          <h1 class="reader-title">${article.title}</h1>
          <div class="reader-meta">
            <span>${new Date(article.created_at).toLocaleDateString()}</span>
            <span>${readingTime} min read</span>
            <span>${wordCount} words</span>
          </div>
        </div>
      </div>
      <article
        class="reader-body"
        ref=${articleRef}
        onClick=${handleArticleClick}
        dangerouslySetInnerHTML=${{ __html: contentHtml }}
      ></article>
    </section>
    ${commentsLoading || comments.length > 0
      ? html`
          <section class="glass section animate-in" style=${{ animationDelay: "0.1s" }}>
            <h2 class="section-title">Hacker News Discussion</h2>
            ${commentsLoading
              ? html`<div class="status">Loading comments...</div>`
              : html`
                  <div class="comments">
                    ${comments.map((comment) =>
                      html`<${Comment} key=${comment.id} comment=${comment} />`
                    )}
                  </div>
                `}
          </section>
        `
      : null}
    ${highlightBtn.visible
      ? html`
          <button
            class="highlight-btn"
            style=${{ left: `${highlightBtn.x}px`, top: `${highlightBtn.y}px` }}
            onClick=${() => {
              setHighlightBtn((prev) => ({ ...prev, visible: false }));
              setNoteOpen(true);
            }}
          >
            Highlight
          </button>
        `
      : null}
    ${noteOpen
      ? html`
          <div
            class="overlay"
            onClick=${() => {
              setNoteOpen(false);
              setNoteValue("");
            }}
          ></div>
          <div class="modal glass">
            <h3 class="section-title">Add a note</h3>
            <textarea
              class="input"
              placeholder="Your thoughts"
              value=${noteValue}
              onInput=${(event) => setNoteValue(event.target.value)}
            ></textarea>
            <div class="modal-actions">
              <button
                class="btn ghost"
                onClick=${() => {
                  setNoteOpen(false);
                  setNoteValue("");
                }}
              >
                Cancel
              </button>
              <button class="btn primary" onClick=${addHighlight}>Save</button>
            </div>
          </div>
        `
      : null}
    ${noteToast
      ? html`
          <div class="note-toast glass strong">
            <div class="section-sub">${noteToast}</div>
          </div>
        `
      : null}
  `;
}

function Comment({ comment }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const kids = comment.kids || [];

  async function loadReplies() {
    if (kids.length === 0) return;
    setLoading(true);
    const list = await Promise.all(
      kids.slice(0, 20).map((id) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json()))
    );
    setReplies(list.filter(Boolean));
    setLoading(false);
  }

  if (comment.deleted || comment.dead) {
    return null;
  }

  return html`
    <div class="comment">
      <div class="comment-meta">
        ${comment.by || ""} | ${new Date(comment.time * 1000).toLocaleDateString()}
      </div>
      <div class="comment-text" dangerouslySetInnerHTML=${{ __html: comment.text || "" }}></div>
      ${kids.length > 0
        ? html`
            <div class="list-actions">
              <button class="btn ghost" onClick=${loadReplies}>
                ${loading ? "Loading..." : `Load ${kids.length} replies`}
              </button>
            </div>
          `
        : null}
      ${replies.length > 0
        ? html`<div class="comments">
            ${replies.map((reply) => html`<${Comment} key=${reply.id} comment=${reply} />`)}
          </div>`
        : null}
    </div>
  `;
}

function FeedsView({ authKey, onAuthFail }) {
  const [feeds, setFeeds] = useState([]);
  const [items, setItems] = useState([]);
  const [newFeed, setNewFeed] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  async function feedsApi(type, options = {}) {
    return callApi({
      endpoint: API_FEEDS,
      type,
      authKey,
      onUnauthorized: onAuthFail,
      method: "POST",
      ...options,
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const subs = await feedsApi("get_subscriptions");
    const unread = await feedsApi("get_unread");
    setFeeds(subs || []);
    setItems(unread || []);
    setLoading(false);
  }

  async function addFeed() {
    if (!newFeed) return;
    await feedsApi("add_feed", { body: { url: newFeed } });
    setNewFeed("");
    loadAll();
  }

  async function refreshFeeds() {
    await feedsApi("refresh_feeds");
    loadAll();
  }

  async function deleteFeed(id) {
    if (!confirm("Remove this feed?")) return;
    await feedsApi("delete_feed", { body: { id } });
    loadAll();
  }

  async function markRead(id) {
    await feedsApi("mark_read", { body: { id } });
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function openPreview(item) {
    await markRead(item.id);
    const url = `${API_FEEDS}?type=preview&url=${encodeURIComponent(item.url)}`;
    const res = await fetch(url, { headers: { "x-auth-key": authKey } });
    const data = await res.json();
    setPreview({
      title: data.title,
      content: data.content,
      url: data.url,
    });
  }

  async function savePreview() {
    if (!preview) return;
    await callApi({
      endpoint: API_LIBRARY,
      type: "save",
      method: "POST",
      body: { url: preview.url },
      authKey,
      onUnauthorized: onAuthFail,
    });
    setPreview(null);
  }

  return html`
    <section class="glass section animate-in">
      <div>
        <h1 class="section-title">Feeds</h1>
        <p class="section-sub">Scan unread items and preview before saving.</p>
      </div>
      <div class="input-row">
        <input
          class="input"
          type="url"
          placeholder="Paste RSS or Atom URL"
          value=${newFeed}
          onInput=${(event) => setNewFeed(event.target.value)}
        />
        <button class="btn primary" onClick=${addFeed}>Add Feed</button>
        <button class="btn ghost" onClick=${refreshFeeds}>Refresh</button>
      </div>
    </section>
    <section class="glass section animate-in" style=${{ animationDelay: "0.1s" }}>
      <h2 class="section-title">Subscriptions</h2>
      <div class="list-actions">
        ${(feeds || []).length === 0
          ? html`<span class="status">No subscriptions yet.</span>`
          : feeds.map(
              (feed) => html`
                <span key=${feed.id} class="tag">
                  ${feed.title}
                  <button class="btn ghost" onClick=${() => deleteFeed(feed.id)}>Remove</button>
                </span>
              `
            )}
      </div>
    </section>
    <section class="glass section animate-in" style=${{ animationDelay: "0.2s" }}>
      <h2 class="section-title">Unread Items</h2>
      ${loading
        ? html`<div class="status">Loading unread items...</div>`
        : html`
            <ul class="list">
              ${items.length === 0
                ? html`<li class="list-item">All caught up.</li>`
                : items.map((item, index) => html`
                    <li
                      key=${item.id || index}
                      class="list-item animate-in"
                      style=${{ animationDelay: `${index * 0.02}s` }}
                    >
                      <div>
                        <p class="list-title">${item.title}</p>
                        <div class="list-meta">
                          ${item.feed_title} | ${new Date(item.pub_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div class="list-actions">
                        <button class="btn secondary" onClick=${() => openPreview(item)}>Preview</button>
                        <button class="btn ghost" onClick=${() => markRead(item.id)}>Mark Read</button>
                      </div>
                    </li>
                  `)}
            </ul>
          `}
    </section>
    ${preview
      ? html`
          <div class="overlay" onClick=${() => setPreview(null)}></div>
          <div class="modal glass" style=${{ width: "min(90vw, 860px)", maxHeight: "85vh", overflow: "auto" }}>
            <h3 class="section-title">${preview.title}</h3>
            <div class="list-actions">
              <button class="btn primary" onClick=${savePreview}>Save to Library</button>
              <button class="btn ghost" onClick=${() => window.open(preview.url, "_blank")}>Open Original</button>
              <button class="btn ghost" onClick=${() => setPreview(null)}>Close</button>
            </div>
            <div class="reader-body" dangerouslySetInnerHTML=${{ __html: preview.content }}></div>
          </div>
        `
      : null}
  `;
}

function HighlightsView({ authKey, onAuthFail, navigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function libraryApi(type, options = {}) {
    return callApi({
      endpoint: API_LIBRARY,
      type,
      authKey,
      onUnauthorized: onAuthFail,
      ...options,
    });
  }

  useEffect(() => {
    loadHighlights();
  }, []);

  async function loadHighlights() {
    setLoading(true);
    const data = await libraryApi("all_highlights");
    setItems(data || []);
    setLoading(false);
  }

  async function deleteHighlight(id) {
    if (!confirm("Delete this highlight?")) return;
    await libraryApi("delete_highlight", {
      method: "POST",
      body: { id },
    });
    loadHighlights();
  }

  return html`
    <section class="glass section animate-in">
      <div>
        <h1 class="section-title">Highlights</h1>
        <p class="section-sub">Your saved notes and quotes.</p>
      </div>
      ${loading
        ? html`<div class="status">Loading highlights...</div>`
        : html`
            <div class="card-grid">
              ${items.length === 0
                ? html`<div class="status">No highlights yet.</div>`
                : items.map((item) => html`
                    <div key=${item.id} class="highlight-card">
                      <p class="highlight-quote">"${item.quote}"</p>
                      ${item.note ? html`<div class="section-sub">${item.note}</div>` : null}
                      <div class="list-actions">
                        <button class="btn secondary" onClick=${() => navigate("/reader", { id: item.article_id })}>
                          Open Article
                        </button>
                        <button class="btn ghost" onClick=${() => deleteHighlight(item.id)}>Delete</button>
                      </div>
                    </div>
                  `)}
            </div>
          `}
    </section>
  `;
}

function SettingsView({ settings, updateSetting }) {
  return html`
    <section class="glass section animate-in">
      <div>
        <h1 class="section-title">Settings</h1>
        <p class="section-sub">Tune the glass, type, and reading rhythm.</p>
      </div>
      <div class="settings-grid">
        <div class="setting-group">
          <div class="setting-label">Theme</div>
          <div class="segmented">
            <button
              class=${settings.theme === "frost" ? "active" : ""}
              onClick=${() => updateSetting("theme", "frost")}
            >
              Frost
            </button>
            <button
              class=${settings.theme === "noir" ? "active" : ""}
              onClick=${() => updateSetting("theme", "noir")}
            >
              Noir
            </button>
          </div>
        </div>
        <div class="setting-group">
          <div class="setting-label">Typeface</div>
          <div class="segmented">
            <button
              class=${settings.font === "serif" ? "active" : ""}
              onClick=${() => updateSetting("font", "serif")}
            >
              Serif
            </button>
            <button
              class=${settings.font === "sans" ? "active" : ""}
              onClick=${() => updateSetting("font", "sans")}
            >
              Sans
            </button>
          </div>
        </div>
        <div class="setting-group">
          <div class="setting-label">Weight</div>
          <div class="segmented">
            <button
              class=${settings.weight === "400" ? "active" : ""}
              onClick=${() => updateSetting("weight", "400")}
            >
              Regular
            </button>
            <button
              class=${settings.weight === "600" ? "active" : ""}
              onClick=${() => updateSetting("weight", "600")}
            >
              Bold
            </button>
          </div>
        </div>
        <div class="setting-group">
          <div class="setting-label">Base Size (${settings.size}px)</div>
          <input
            class="range"
            type="range"
            min="14"
            max="24"
            value=${settings.size}
            onInput=${(event) => updateSetting("size", Number(event.target.value))}
          />
        </div>
        <div class="highlight-card">
          <div class="reader-body">
            <p>This is a preview of how your articles will look in the reader.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function stripHtml(htmlString) {
  const tmp = document.createElement("div");
  tmp.innerHTML = htmlString;
  return tmp.textContent || tmp.innerText || "";
}

const root = createRoot(document.getElementById("root"));
root.render(html`<${App} />`);
