const c = require("../lib/core");
module.exports = async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) return res.status(401).end();
  const bad = c.menu.meals.find((m) => !/^\d{2}:\d{2}$/.test(m.start || ""));
  if (bad) return res.status(500).json({ error: `menu.json: "start" must be 24h HH:MM for ${bad.name}` });
  const { day, min } = c.now();
  if (req.query.test) {
    const f = (await c.r("HGETALL", "cfg")) || [];
    for (let k = 0; k < f.length; k += 2) await c.send(f[k], "✅ Test\n" + c.next());
    return res.json({ test: true, users: f.length / 2 });
  }
  const due = c.menu.meals.map((m, i) => ({ m, i, d: c.mins(m.start) - min })).filter((x) => x.d > 0 && x.d <= 60);
  if (!due.length) return res.json({ sent: 0, day, min, due: [] });
  const flat = (await c.r("HGETALL", "cfg")) || [];
  let n = 0;
  const jobs = [];
  for (let k = 0; k < flat.length; k += 2) {
    const id = flat[k], s = c.parse(flat[k + 1]);
    for (const x of due)
      if (s.mask[x.i] === "1" && x.d <= s.lead && x.d > s.lead - 5)
        jobs.push((async () => {
          if (await c.r("SET", `sent:${id}:${day}:${x.m.start}`, 1, "NX", "EX", 7200)) { n++; await c.send(id, `⏰ In ${x.d} min\n` + c.fmt(x.m, day)); }
        })());
  }
  await Promise.all(jobs);
  res.json({ sent: n, day, min, due: due.map((x) => x.d), users: flat.length / 2 });
};
