const c = require("../lib/core");
const B = { "🍽 Next": "/next", "📅 Today": "/today", "🔔 Subscribe": "/start", "🔕 Stop": "/stop", "⚙ Settings": "/settings" };
module.exports = async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.WEBHOOK_SECRET) return res.status(401).end();
  const q = req.body && req.body.callback_query;
  if (q) {
    const id = q.message.chat.id, d = q.data, s = await c.get(id);
    if (d[0] === "m") { const i = +d.slice(1); s.mask = s.mask.slice(0, i) + (s.mask[i] === "1" ? "0" : "1") + s.mask.slice(i + 1); }
    else if (d[0] === "l") s.lead = +d.slice(1);
    await c.put(id, s);
    await c.tg("editMessageReplyMarkup", { chat_id: id, message_id: q.message.message_id, reply_markup: c.settingsKB(s) });
    await c.tg("answerCallbackQuery", { callback_query_id: q.id, text: "Saved" });
    return res.status(200).send("ok");
  }
  const m = req.body && req.body.message;
  if (m && m.text) {
    const id = m.chat.id, cmd = B[m.text] || m.text.split(/[\s@]/)[0];
    if (cmd === "/start") { await c.ensure(id); await c.send(id, "Subscribed. Tap ⚙ Settings to pick meals and reminder time."); }
    else if (cmd === "/stop") { await c.r("HDEL", "cfg", id); await c.send(id, "Unsubscribed."); }
    else if (cmd === "/settings") { await c.ensure(id); await c.send(id, "Tap meals to toggle. Pick minutes before the meal:", c.settingsKB(await c.get(id))); }
    else await c.send(id, cmd === "/today" ? c.today() : c.next());
  }
  res.status(200).send("ok");
};
