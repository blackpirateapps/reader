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
    // 3. Fetch HTML
    const response = await fetch(url, {
        headers: {
            // Pretend to be a real browser to avoid blocks and get better images
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
    });
    
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    
    const html = await response.text();
    
    // 4. Load into JSDOM
    // Passing { url } is CRITICAL for resolving relative links (e.g. src="/img.jpg")
    const doc = new JSDOM(html, { url });
    const document = doc.window.document;

    // --- IMAGE FIXING MAGIC ---
    // Fix lazy-loaded images before Readability runs
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        // 1. Handle common lazy loading patterns
        const lazySrc = img.getAttribute('data-src') || 
                        img.getAttribute('data-original') || 
                        img.getAttribute('data-url');
        
        if (lazySrc) {
            img.setAttribute('src', lazySrc);
        }

        // 2. Ensure all Srcs are Absolute URLs
        // JSDOM's img.src property automatically resolves relative paths using the base URL
        if (img.src) {
            img.setAttribute('src', img.src);
        }
    });
    // --------------------------

    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) throw new Error("Could not parse article");

    // 5. Save to Turso (SQL)
    await turso.execute({
      sql: `INSERT INTO articles (url, title, content, created_at) 
            VALUES (?, ?, ?, datetime('now'))`,
      args: [url, article.title, article.content]
    });

    return res.status(200).json({ success: true, title: article.title });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}