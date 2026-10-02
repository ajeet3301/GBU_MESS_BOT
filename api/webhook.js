const c = require("../lib/core");
module.exports = async (req, res) => {
  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.WEBHOOK_SECRET) return res.status(401).end();
  const m = req.body && req.body.message;
  if (m && m.text) {
    const id = m.chat.id, cmd = m.text.split(/[\s@]/)[0];
    if (cmd === "/start") { await c.r("SADD", "chats", id); await c.send(id, "Subscribed to mess reminders.\n/next /today /stop"); }
    else if (cmd === "/stop") { await c.r("SREM", "chats", id); await c.send(id, "Unsubscribed."); }
    else await c.send(id, cmd === "/today" ? c.today() : c.next());
  }
  res.status(200).send("ok");
};
