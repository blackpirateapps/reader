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

  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "ID required" });

  try {
    const result = await turso.execute({
        sql: "SELECT * FROM articles WHERE id = ?",
        args: [id]
    });

    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Article not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}