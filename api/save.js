import { createClient } from "@libsql/client";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

// 1. Setup Turso DB Connection
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // 2. Simple Authentication Check
  if (req.headers['x-auth-key'] !== process.env.MY_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized: Wrong Secret Key" });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    // 3. Scrape and Clean
    const response = await fetch(url);
    const html = await response.text();
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) throw new Error("Could not parse article");

    // 4. Save to Turso (SQL)
    await turso.execute({
      sql: `INSERT INTO articles (url, title, content, created_at) 
            VALUES (?, ?, ?, datetime('now'))`,
      args: [url, article.title, article.content]
    });

    return res.status(200).json({ success: true, title: article.title });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}