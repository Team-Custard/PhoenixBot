// UserDB settings on the website (/userdb). Only needs a login, not a server.
const express = require("express");
const moment = require("moment-timezone");

const router = express.Router();

class UserdbError extends Error {
  constructor(message, field) {
    super(message);
    this.status = 400;
    this.field = field;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function model() {
  const UserDB = require("../tools/UserDB");
  // UserDB can be turned off in config.json (userdb.global), which exports nothing.
  if (typeof UserDB.findById !== "function") {
    const err = new Error("UserDB isn't available on this bot.");
    err.status = 404;
    throw err;
  }
  return UserDB;
}

function text(value, max, label, field) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new UserdbError(`${label} must be text.`, field);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new UserdbError(`${label} can be at most ${max} characters.`, field);
  return trimmed;
}

// Handles: accept "sylveondev", "@sylveondev" or a full profile link.
const SOCIALS = {
  youtube: { label: "YouTube handle", re: /^@?([\w.-]{3,30})$/, link: /youtube\.com\/@?([\w.-]{3,30})/i, store: (h) => `@${h}` },
  twitter: { label: "Twitter / X handle", re: /^@?(\w{1,15})$/, link: /(?:twitter|x)\.com\/@?(\w{1,15})/i, store: (h) => `@${h}` },
  reddit: { label: "Reddit username", re: /^(?:u\/)?([\w-]{3,20})$/, link: /reddit\.com\/u(?:ser)?\/([\w-]{3,20})/i, store: (h) => h },
  server: { label: "Discord server invite", re: /^([\w-]{2,32})$/, link: /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([\w-]{2,32})/i, store: (h) => h },
};

function social(key, value) {
  const raw = text(value, 100, SOCIALS[key].label, `socials.${key}`);
  if (!raw) return null;
  const spec = SOCIALS[key];
  const match = spec.link.exec(raw) ?? spec.re.exec(raw);
  if (!match) throw new UserdbError(`${spec.label} doesn't look right.`, `socials.${key}`);
  return spec.store(match[1]);
}

function profileOut(doc) {
  if (!doc) return null;
  return {
    timezone: doc.timezone ?? null,
    pronouns: doc.pronouns ?? null,
    description: doc.description ?? null,
    socials: {
      youtube: doc.socials?.youtube ?? null,
      twitter: doc.socials?.twitter ?? null,
      reddit: doc.socials?.reddit ?? null,
      server: doc.socials?.server ?? null,
    },
    ephemeral: Boolean(doc.ephemeral),
    afk: doc.afk?.status ? { reason: doc.afk.status, since: doc.afk.since ? Number(doc.afk.since) : null } : null,
  };
}

router.get("/userdb", wrap(async (req, res) => {
  const doc = await model().findById(req.session.user.id).lean();
  res.json({ user: req.session.user, profile: profileOut(doc) });
}));

router.put("/userdb", wrap(async (req, res) => {
  const UserDB = model();
  const body = req.body ?? {};
  const timezone = text(body.timezone, 64, "Time zone", "timezone");
  if (timezone && !moment.tz.zone(timezone)) throw new UserdbError("That time zone isn't one Phoenix knows. Pick one from the list.", "timezone");
  const update = {
    timezone,
    pronouns: text(body.pronouns, 40, "Pronouns", "pronouns"),
    description: text(body.description, 300, "About you", "description"),
    socials: Object.fromEntries(Object.keys(SOCIALS).map((key) => [key, social(key, body.socials?.[key])])),
    ephemeral: Boolean(body.ephemeral),
  };
  let doc = await UserDB.findById(req.session.user.id);
  if (!doc) doc = new UserDB({ _id: req.session.user.id });
  doc.set(update);
  // Saving the document (rather than updateOne) also clears the bot's query cache.
  await doc.save();
  res.json({ profile: profileOut(doc) });
}));

router.delete("/userdb/afk", wrap(async (req, res) => {
  const doc = await model().findById(req.session.user.id);
  if (doc?.afk?.status) {
    doc.afk = { since: null, status: null };
    await doc.save();
  }
  res.json({ profile: profileOut(doc) });
}));

// Deletes everything UserDB has about you.
router.delete("/userdb", wrap(async (req, res) => {
  const doc = await model().findById(req.session.user.id);
  if (doc) await doc.deleteOne();
  res.json({ profile: null });
}));

module.exports = router;
module.exports.UserdbError = UserdbError;
