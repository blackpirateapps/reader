import { createClient } from "@libsql/client";

// Initialize DB (Lightweight, safe to load on every request)
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // 1. Global Auth Check
  if (req.headers['x-auth-key'] !== process.env.MY_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 2. Determine Action (from Query param or Body)
  // Usage: GET /api/library?type=list
  // Usage: POST /api/library (body: { type: 'save', url: '...' })
  const type = req.query.type || req.body.type;

  try {
    switch (type) {
      
      // --- READ OPERATIONS (Fast) ---

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

      // --- WRITE OPERATIONS (Heavier) ---

      case 'save': {
        const { url } = req.body;
        if (!url) throw new Error("URL required");

        // DYNAMIC IMPORT: Only load these heavy libs if we are actually saving
        const { JSDOM } = await import("jsdom");
        const { Readability } = await import("@mozilla/readability");

        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 CleanReader/1.0" }});
        const html = await response.text();
        
        const doc = new JSDOM(html, { url });
        
        // Image Fixing Logic
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
        const { id, action } = req.body; // action = 'archive' or 'unarchive'
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

      default:
        return res.status(400).json({ error: "Invalid action type" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}