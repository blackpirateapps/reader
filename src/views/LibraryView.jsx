import { useEffect, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Flame,
  Inbox,
  Link2,
  Search,
  Trash2,
} from "lucide-react";
import { callApi } from "../utils/api.js";
import PageHeader from "../components/PageHeader.jsx";
import SegmentedControl from "../components/SegmentedControl.jsx";

const API_LIBRARY = "/api/library";
const PAGE_SIZE = 20;

export default function LibraryView({ authKey, navigate, onAuthFail }) {
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
    document.title = "Library - Clean Reader";
  }, []);

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
        const res = await fetch(
          "https://hacker-news.firebaseio.com/v0/topstories.json"
        );
        ids = await res.json();
        setHnIds(ids || []);
      }
      const start = hnPage * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const slice = (ids || []).slice(start, end);
      const stories = await Promise.all(
        slice.map((id) =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(
            (r) => r.json()
          )
        )
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

  const tabs = [
    { value: "inbox", label: "Reading List", icon: Inbox },
    { value: "hn", label: "Hacker News", icon: Flame },
    { value: "archive", label: "Archive", icon: Archive },
  ];

  const maxPage = Math.max(0, Math.ceil(hnIds.length / PAGE_SIZE) - 1);

  return (
    <div className="view">
      <PageHeader
        title="Library"
        subtitle="Capture links, read in peace, keep everything tidy."
      />
      <section className="card">
        <div className="field-group">
          <div className="field">
            <label>
              <Link2 size={16} /> Save a link
            </label>
            <div className="field-row">
              <input
                className="input"
                type="url"
                placeholder="Paste an article URL"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
              />
              <button className="btn primary" onClick={() => saveUrl(urlInput)}>
                Save
              </button>
            </div>
          </div>
          <div className="field">
            <label>
              <Search size={16} /> Search
            </label>
            <input
              className="input"
              type="search"
              placeholder="Search your library"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              disabled={view === "hn"}
            />
          </div>
          <SegmentedControl
            options={tabs}
            value={view}
            onChange={(next) => {
              setView(next);
              setSearchQuery("");
              if (next === "hn") setHnPage(0);
            }}
          />
          {status ? <div className="status">{status}</div> : null}
        </div>
      </section>
      <section className="card">
        {view === "hn" ? (
          <div className="stack">
            <div className="status">
              {hnLoading ? "Loading Hacker News..." : "Top stories"}
            </div>
            <ul className="list">
              {hnItems.length === 0 && !hnLoading ? (
                <li className="list-item">No stories loaded.</li>
              ) : (
                hnItems.map((item) => {
                  const domain = item.url
                    ? new URL(item.url).hostname.replace("www.", "")
                    : "news.ycombinator.com";
                  return (
                    <li className="list-item" key={item.id}>
                      <div>
                        <div className="list-title">{item.title}</div>
                        <div className="list-meta">
                          {item.score || 0} points | {item.by || ""} | {domain}
                        </div>
                      </div>
                      <div className="list-actions">
                        {item.url ? (
                          <button
                            className="btn ghost"
                            onClick={() => window.open(item.url, "_blank")}
                          >
                            <ArrowUpRight size={16} />
                            Open
                          </button>
                        ) : null}
                        {item.url ? (
                          <button
                            className="btn primary"
                            onClick={() => saveFromHN(item)}
                          >
                            Save + Read
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="pagination">
              <button
                className="btn ghost"
                onClick={() => setHnPage(Math.max(0, hnPage - 1))}
              >
                Prev
              </button>
              <span>Page {hnPage + 1}</span>
              <button
                className="btn ghost"
                onClick={() => setHnPage(Math.min(maxPage, hnPage + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="status">Loading articles...</div>
        ) : (
          <ul className="list">
            {articles.length === 0 ? (
              <li className="list-item">No articles found.</li>
            ) : (
              articles.map((item) => (
                <li className="list-item" key={item.id}>
                  <div>
                    <div className="list-title">{item.title}</div>
                    <div className="list-meta">
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      | {new URL(item.url).hostname.replace("www.", "")}
                    </div>
                  </div>
                  <div className="list-actions">
                    <button
                      className="btn primary"
                      onClick={() => navigate("/reader", { id: item.id })}
                    >
                      Read
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() =>
                        updateArchive(
                          item.id,
                          view === "archive" ? "unarchive" : "archive"
                        )
                      }
                    >
                      {view === "archive" ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      className="btn ghost danger"
                      onClick={() => deleteArticle(item.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
