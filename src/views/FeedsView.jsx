import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Eye,
  Plus,
  RefreshCw,
  Rss,
} from "lucide-react";
import { callApi } from "../utils/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Modal from "../components/Modal.jsx";

const API_FEEDS = "/api/feeds";
const API_LIBRARY = "/api/library";

export default function FeedsView({ authKey, onAuthFail }) {
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
    document.title = "Feeds - Clean Reader";
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

  return (
    <div className="view">
      <PageHeader
        title="Feeds"
        subtitle="Pull in RSS and curate the best pieces."
        actions={
          <button className="btn ghost" onClick={refreshFeeds}>
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />
      <section className="card">
        <div className="field">
          <label>
            <Rss size={16} /> Add a feed
          </label>
          <div className="field-row">
            <input
              className="input"
              type="url"
              placeholder="Paste RSS or Atom URL"
              value={newFeed}
              onChange={(event) => setNewFeed(event.target.value)}
            />
            <button className="btn primary" onClick={addFeed}>
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </section>
      <section className="card">
        <div className="section-title">Subscriptions</div>
        <div className="chip-row">
          {feeds.length === 0 ? (
            <div className="status">No subscriptions yet.</div>
          ) : (
            feeds.map((feed) => (
              <div className="chip" key={feed.id}>
                {feed.title}
                <button className="btn ghost" onClick={() => deleteFeed(feed.id)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="card">
        <div className="section-title">Unread Items</div>
        {loading ? (
          <div className="status">Loading unread items...</div>
        ) : (
          <ul className="list">
            {items.length === 0 ? (
              <li className="list-item">All caught up.</li>
            ) : (
              items.map((item) => (
                <li className="list-item" key={item.id}>
                  <div>
                    <div className="list-title">{item.title}</div>
                    <div className="list-meta">
                      {item.feed_title} | {new Date(item.pub_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="list-actions">
                    <button className="btn primary" onClick={() => openPreview(item)}>
                      <Eye size={16} /> Preview
                    </button>
                    <button className="btn ghost" onClick={() => markRead(item.id)}>
                      Mark Read
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
      <Modal open={!!preview} onClose={() => setPreview(null)} size="wide">
        {preview ? (
          <div className="modal-content">
            <div className="modal-header">
              <h3>{preview.title}</h3>
              <p>Preview before saving to your library.</p>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={savePreview}>
                Save to Library
              </button>
              <button
                className="btn ghost"
                onClick={() => window.open(preview.url, "_blank")}
              >
                <ArrowUpRight size={16} /> Open Original
              </button>
              <button className="btn ghost" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
            <div
              className="reader-body preview-body"
              dangerouslySetInnerHTML={{ __html: preview.content }}
            ></div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
