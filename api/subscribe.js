const c = require("../lib/core");
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120)
    return res.status(400).json({ error: "Enter a valid email." });
  await c.r("SADD", "emails", email);
  res.json({ ok: true });
};
