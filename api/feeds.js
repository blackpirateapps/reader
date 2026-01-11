import { createClient } from "@libsql/client";
import { JSDOM } from "jsdom";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Auth Check
  if (req.headers['x-auth-key'] !== process.env.MY_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, url, id } = req.body || req.query;

  try {
    switch (type) {
      case 'add_feed': {
        // 1. Fetch to validate and get title
        const feedData = await fetchAndParse(url);
        if (!feedData) throw new Error("Could not parse feed");

        await turso.execute({
          sql: "INSERT INTO feeds (url, title) VALUES (?, ?)",
          args: [url, feedData.title]
        });
        return res.json({ success: true });
      }

      case 'refresh_feeds': {
        // 1. Get all feeds
        const feeds = await turso.execute("SELECT * FROM feeds");
        let newCount = 0;

        // 2. Fetch all in parallel (limit this if you have 50+ feeds)
        await Promise.all(feeds.rows.map(async (feed) => {
          try {
            const data = await fetchAndParse(feed.url);
            if (!data) return;

            // 3. Insert items (Ignore duplicates via SQL UNIQUE constraint)
            for (const item of data.items) {
               try {
                 await turso.execute({
                   sql: `INSERT OR IGNORE INTO feed_items 
                         (feed_id, guid, title, url, pub_date) 
                         VALUES (?, ?, ?, ?, ?)`,
                   args: [feed.id, item.guid, item.title, item.link, item.pubDate]
                 });
                 newCount++;
               } catch(err) { /* ignore individual insert errors */ }
            }
          } catch (e) { console.error(`Failed ${feed.url}`, e); }
        }));

        return res.json({ success: true, new_items: newCount });
      }

      case 'get_unread': {
        const result = await turso.execute(`
          SELECT i.*, f.title as feed_title 
          FROM feed_items i
          JOIN feeds f ON i.feed_id = f.id
          WHERE i.is_read = 0
          ORDER BY i.pub_date DESC LIMIT 100
        `);
        return res.json(result.rows);
      }

      case 'mark_read': {
        await turso.execute({
          sql: "UPDATE feed_items SET is_read = 1 WHERE id = ?",
          args: [id]
        });
        return res.json({ success: true });
      }
      
      case 'get_subscriptions': {
          const result = await turso.execute("SELECT * FROM feeds ORDER BY title ASC");
          return res.json(result.rows);
      }

      case 'delete_feed': {
          // Delete items first, then feed
          await turso.execute({ sql: "DELETE FROM feed_items WHERE feed_id = ?", args: [id] });
          await turso.execute({ sql: "DELETE FROM feeds WHERE id = ?", args: [id] });
          return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: "Invalid type" });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

// Helper to parse RSS/Atom using JSDOM
async function fetchAndParse(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  const dom = new JSDOM(text, { contentType: "text/xml" });
  const doc = dom.window.document;

  const title = doc.querySelector("channel > title, feed > title")?.textContent || "Unknown Feed";
  
  // Try RSS 'item' or Atom 'entry'
  const els = doc.querySelectorAll("item, entry");
  const items = [];

  els.forEach(el => {
    const t = el.querySelector("title")?.textContent || "No Title";
    
    // Link can be text (RSS) or href attr (Atom)
    let link = el.querySelector("link")?.textContent;
    if(!link) link = el.querySelector("link")?.getAttribute("href");
    
    // GUID or ID or Link
    const guid = el.querySelector("guid, id")?.textContent || link;
    
    const pubDate = el.querySelector("pubDate, published, updated")?.textContent || new Date().toISOString();

    if (link) items.push({ title: t, link, guid, pubDate });
  });

  return { title, items };
}