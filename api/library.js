import { createClient } from "@libsql/client";

// Initialize DB
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // 1. Global Auth Check
  if (req.headers['x-auth-key'] !== process.env.MY_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const type = req.query.type || req.body.type;

  try {
    switch (type) {
      // --- EXISTING CASES ---
      case 'list': {
        const showArchived = req.query.archived === 'true' ? 1 : 0;
        const result = await turso.execute({
          sql: "SELECT id, title, url, created_at, is_archived FROM articles WHERE is_archived = ? ORDER BY created_at DESC LIMIT 50",
          args: [showArchived]
        });
        return res.status(200).json(result.rows);
      }

      case 'read': {
        const { id } = req.query;
        const result = await turso.execute({
            sql: "SELECT * FROM articles WHERE id = ?",
            args: [id]
        });
        return res.status(200).json(result.rows[0] || {});
      }

      case 'search': {
        const { q } = req.query;
        if (!q) return res.json([]);
        const result = await turso.execute({
            sql: `SELECT id, title, url, created_at, is_archived FROM articles 
                  WHERE (title LIKE ? OR content LIKE ?) ORDER BY created_at DESC LIMIT 20`,
            args: [`%${q}%`, `%${q}%`]
        });
        return res.status(200).json(result.rows);
      }

      case 'save': {
        const { url } = req.body;
        if (!url) throw new Error("URL required");

        const { JSDOM } = await import("jsdom");
        const { Readability } = await import("@mozilla/readability");

        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 CleanReader/1.0" }});
        const html = await response.text();
        const doc = new JSDOM(html, { url });
        
        doc.window.document.querySelectorAll('img').forEach(img => {
            const lazy = img.getAttribute('data-src') || img.getAttribute('data-url');
            if(lazy) img.src = lazy;
        });

        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        await turso.execute({
          sql: `INSERT INTO articles (url, title, content, created_at) VALUES (?, ?, ?, datetime('now'))`,
          args: [url, article.title, article.content]
        });

        return res.status(200).json({ success: true, title: article.title });
      }

      case 'archive': {
        const { id, action } = req.body;
        const val = action === 'archive' ? 1 : 0;
        await turso.execute({
            sql: "UPDATE articles SET is_archived = ? WHERE id = ?",
            args: [val, id]
        });
        return res.status(200).json({ success: true });
      }

      case 'delete': {
        await turso.execute({
            sql: "DELETE FROM articles WHERE id = ?",
            args: [req.body.id]
        });
        return res.status(200).json({ success: true });
      }

      // --- NEW HIGHLIGHT FEATURES ---

      case 'add_highlight': {
        const { article_id, quote, note } = req.body;
        if (!article_id || !quote) return res.status(400).json({ error: "Missing data" });
        
        const result = await turso.execute({
            sql: "INSERT INTO highlights (article_id, quote, note) VALUES (?, ?, ?)",
            args: [article_id, quote, note || ""]
        });
        return res.status(200).json({ success: true, id: result.lastInsertRowid });
      }

      case 'get_highlights': {
        const { article_id } = req.query;
        const result = await turso.execute({
            sql: "SELECT * FROM highlights WHERE article_id = ? ORDER BY id ASC",
            args: [article_id]
        });
        return res.status(200).json(result.rows);
      }

      case 'all_highlights': {
        // Joins with articles to get the title for the highlights page
        const result = await turso.execute(`
            SELECT h.id, h.quote, h.note, h.created_at, h.article_id, a.title 
            FROM highlights h 
            JOIN articles a ON h.article_id = a.id 
            ORDER BY h.created_at DESC LIMIT 100
        `);
        return res.status(200).json(result.rows);
      }

      case 'delete_highlight': {
        const { id } = req.body;
        await turso.execute({
            sql: "DELETE FROM highlights WHERE id = ?",
            args: [id]
        });
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: "Invalid action type" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}