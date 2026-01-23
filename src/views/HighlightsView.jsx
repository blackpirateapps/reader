import { useEffect, useState } from "react";
import { BookOpenText, Trash2 } from "lucide-react";
import { callApi } from "../utils/api.js";
import PageHeader from "../components/PageHeader.jsx";

const API_LIBRARY = "/api/library";

export default function HighlightsView({ authKey, onAuthFail, navigate }) {
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
    document.title = "Highlights - Clean Reader";
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

  return (
    <div className="view">
      <PageHeader
        title="Highlights"
        subtitle="All your saved passages, ready to revisit."
      />
      <section className="card">
        {loading ? (
          <div className="status">Loading highlights...</div>
        ) : items.length === 0 ? (
          <div className="status">No highlights yet.</div>
        ) : (
          <div className="highlight-grid">
            {items.map((item) => (
              <div className="highlight-card" key={item.id}>
                <p className="highlight-quote">"{item.quote}"</p>
                {item.note ? <p className="highlight-note">{item.note}</p> : null}
                <div className="highlight-actions">
                  <button
                    className="btn primary"
                    onClick={() => navigate("/reader", { id: item.article_id })}
                  >
                    <BookOpenText size={16} /> Open Article
                  </button>
                  <button
                    className="btn ghost danger"
                    onClick={() => deleteHighlight(item.id)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
