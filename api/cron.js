const c = require("../lib/core");
module.exports = async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) return res.status(401).end();
  const { day, min } = c.now();
  let n = 0;
  for (const m of c.menu.meals) {
    const t = c.mins(m.time) - c.menu.leadMinutes;
    if (min >= t && min < t + 5 && (await c.r("SET", `sent:${day}:${m.time}`, 1, "NX", "EX", 3600))) {
      const ids = (await c.r("SMEMBERS", "chats")) || [];
      await Promise.all(ids.map((id) => c.send(id, c.fmt(m, day))));
      n++;
    }
  }
  res.json({ sent: n });
};
