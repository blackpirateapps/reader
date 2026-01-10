import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Auth Check
  if (req.headers['x-auth-key'] !== process.env.MY_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await turso.execute(
      "SELECT id, title, url, created_at FROM articles ORDER BY id DESC LIMIT 50"
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}