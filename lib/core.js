const menu = require("../menu.json");
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const r = (...c) =>
  fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.UPSTASH_REDIS_REST_TOKEN },
    body: JSON.stringify(c),
  }).then((x) => x.json()).then((x) => x.result);
const tg = (m, b) =>
  fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${m}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b),
  }).catch(() => {});
const KB = { keyboard: [["🍽 Next", "📅 Today"], ["⚙ Settings"], ["🔔 Subscribe", "🔕 Stop"]], resize_keyboard: true };
const send = (id, text, kb = KB) => tg("sendMessage", { chat_id: id, text, reply_markup: kb });
const LEADS = [5, 10, 15, 30, 60];
const parse = (v) => {
  const [l, k] = String(v || "").split(":");
  return { lead: +l || menu.leadMinutes, mask: (k || "").padEnd(menu.meals.length, "1") };
};
const get = async (id) => parse(await r("HGET", "cfg", id));
const put = (id, s) => r("HSET", "cfg", id, `${s.lead}:${s.mask}`);
const ensure = (id) => r("HSETNX", "cfg", id, `${menu.leadMinutes}:${"1".repeat(menu.meals.length)}`);
const settingsKB = (s) => ({
  inline_keyboard: [
    ...menu.meals.map((m, i) => [{ text: (s.mask[i] === "1" ? "✅ " : "❌ ") + m.name, callback_data: "m" + i }]),
    LEADS.map((l) => ({ text: (l === s.lead ? "🔘 " : "") + l + "m", callback_data: "l" + l })),
  ],
});
const mins = (t) => { const [h, m] = t.split(":"); return +h * 60 + +m; };
const now = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { day: DAYS.indexOf(p.weekday), min: (+p.hour % 24) * 60 + +p.minute };
};
const fmt = (m, d) => `${m.name} (${m.time})\n` + m.days[d].split(", ").map((i) => "• " + i).join("\n");
const next = () => {
  const { day, min } = now();
  const ms = menu.meals.slice().sort((a, b) => mins(a.time) - mins(b.time));
  const m = ms.find((x) => mins(x.time) > min);
  return m ? fmt(m, day) : fmt(ms[0], (day + 1) % 7);
};
const today = () => { const { day } = now(); return menu.meals.map((m) => fmt(m, day)).join("\n\n"); };
module.exports = { menu, r, tg, send, get, put, ensure, parse, settingsKB, mins, now, fmt, next, today };
