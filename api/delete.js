import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.headers['x-auth-key'] !== process.env.MY_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.body;

  try {
    await turso.execute({
        sql: "DELETE FROM articles WHERE id = ?",
        args: [id]
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}