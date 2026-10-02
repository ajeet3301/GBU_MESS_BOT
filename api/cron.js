const c = require("../lib/core");
module.exports = async (req, res) => {
  if (req.query.key !== process.env.CRON_SECRET) return res.status(401).end();
  const { day, min } = c.now();
  const due = c.menu.meals.map((m, i) => ({ m, i, d: c.mins(m.start) - min })).filter((x) => x.d > 0 && x.d <= 60);
  if (!due.length) return res.json({ sent: 0 });
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
  res.json({ sent: n });
};
