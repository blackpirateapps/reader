import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Highlighter,
  MessageSquare,
  Settings,
} from "lucide-react";
import { callApi } from "../utils/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Modal from "../components/Modal.jsx";

const API_LIBRARY = "/api/library";

function stripHtml(htmlString) {
  const tmp = document.createElement("div");
  tmp.innerHTML = htmlString;
  return tmp.textContent || tmp.innerText || "";
}

function applyHighlights(content, items) {
  let updated = content;
  items.forEach((item) => {
    if (updated.includes(item.quote)) {
      const noteText = item.note || "";
      const safeNote = noteText.replace(/"/g, "&quot;");
      const mark = `<mark class=\"highlight\" data-note=\"${safeNote}\">${item.quote}</mark>`;
      updated = updated.replace(item.quote, mark);
    }
  });
  return updated;
}

function Comment({ comment }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const kids = comment.kids || [];

  async function loadReplies() {
    if (kids.length === 0) return;
    setLoading(true);
    const list = await Promise.all(
      kids
        .slice(0, 20)
        .map((id) =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(
            (r) => r.json()
          )
        )
    );
    setReplies(list.filter(Boolean));
    setLoading(false);
  }

  if (comment.deleted || comment.dead) {
    return null;
  }

  return (
    <div className="comment">
      <div className="comment-meta">
        {comment.by || ""} | {new Date(comment.time * 1000).toLocaleDateString()}
      </div>
      <div
        className="comment-text"
        dangerouslySetInnerHTML={{ __html: comment.text || "" }}
      ></div>
      {kids.length > 0 ? (
        <button className="btn ghost" onClick={loadReplies}>
          {loading ? "Loading..." : `Load ${kids.length} replies`}
        </button>
      ) : null}
      {replies.length > 0 ? (
        <div className="comment-thread">
          {replies.map((reply) => (
            <Comment key={reply.id} comment={reply} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ReaderView({ route, navigate, authKey, onAuthFail }) {
  const articleId = route.query.get("id");
  const paramHnId = route.query.get("hn_id");
  const [article, setArticle] = useState(null);
  const [contentHtml, setContentHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [noteToast, setNoteToast] = useState("");
  const [highlightBtn, setHighlightBtn] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
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
      if (!articleRef.current ||
        !articleRef.current.contains(range.commonAncestorContainer)
      ) {
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
      document.title = `${data.title} - Clean Reader`;
      const highlightData = await libraryApi("get_highlights", {
        query: { article_id: articleId },
      });
      const highlightList = highlightData || [];
      setArticle(data);
      setContentHtml(applyHighlights(data.content || "", highlightList));
      const finalHnId = paramHnId || data.hn_id;
      if (finalHnId) {
        loadHNComments(finalHnId);
      }
    }
    setLoading(false);
  }

  async function addHighlight() {
    const selection = selectionRef.current;
    if (!selection.text) return;

    try {
      const mark = document.createElement("mark");
      mark.className = "highlight";
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

  function handleHighlightClick(event) {
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
      const storyRes = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${hnId}.json`
      );
      const story = await storyRes.json();
      if (!story || !story.kids || story.kids.length === 0) {
        setComments([]);
        setCommentsLoading(false);
        return;
      }
      const kids = story.kids.slice(0, 20);
      const list = await Promise.all(
        kids.map((id) =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(
            (r) => r.json()
          )
        )
      );
      setComments(list.filter(Boolean));
    } catch (error) {
      setComments([]);
    }
    setCommentsLoading(false);
  }

  if (!articleId) {
    return <div className="card">Missing article id.</div>;
  }

  if (loading) {
    return <div className="card">Loading article...</div>;
  }

  if (!article) {
    return <div className="card">Article not found.</div>;
  }

  const textContent = stripHtml(contentHtml);
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="view">
      <PageHeader
        title="Reader"
        subtitle="Stay focused and highlight what matters."
        actions={
          <>
            <button className="btn ghost" onClick={() => navigate("/")}>
              <ArrowLeft size={16} />
              Back
            </button>
            <button className="btn ghost" onClick={() => navigate("/settings")}>
              <Settings size={16} />
              Settings
            </button>
            <button
              className="btn primary"
              onClick={() => window.open(article.url, "_blank")}
            >
              <ArrowUpRight size={16} />
              Open Original
            </button>
          </>
        }
      />
      <section className="card reader-card">
        <div className="reader-header">
          <h2>{article.title}</h2>
          <div className="reader-meta">
            <span>{new Date(article.created_at).toLocaleDateString()}</span>
            <span>{readingTime} min read</span>
            <span>{wordCount} words</span>
          </div>
        </div>
        <article
          className="reader-body"
          ref={articleRef}
          onClick={handleHighlightClick}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        ></article>
      </section>
      {commentsLoading || comments.length > 0 ? (
        <section className="card">
          <div className="section-title">
            <MessageSquare size={18} /> Hacker News Discussion
          </div>
          {commentsLoading ? (
            <div className="status">Loading comments...</div>
          ) : (
            <div className="comment-list">
              {comments.map((comment) => (
                <Comment key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </section>
      ) : null}
      {highlightBtn.visible ? (
        <button
          className="floating-btn"
          style={{ left: `${highlightBtn.x}px`, top: `${highlightBtn.y}px` }}
          onClick={() => {
            setHighlightBtn((prev) => ({ ...prev, visible: false }));
            setNoteOpen(true);
          }}
        >
          <Highlighter size={16} /> Highlight
        </button>
      ) : null}
      <Modal
        open={noteOpen}
        onClose={() => {
          setNoteOpen(false);
          setNoteValue("");
        }}
      >
        <div className="modal-header">
          <h3>Add a note</h3>
          <p>Save a highlight with optional context.</p>
        </div>
        <textarea
          className="input"
          placeholder="Your thoughts"
          value={noteValue}
          onChange={(event) => setNoteValue(event.target.value)}
        ></textarea>
        <div className="modal-actions">
          <button
            className="btn ghost"
            onClick={() => {
              setNoteOpen(false);
              setNoteValue("");
            }}
          >
            Cancel
          </button>
          <button className="btn primary" onClick={addHighlight}>
            Save Highlight
          </button>
        </div>
      </Modal>
      {noteToast ? <div className="toast">{noteToast}</div> : null}
    </div>
  );
}
