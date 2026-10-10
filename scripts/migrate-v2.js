// One-time migration for the Project Farrow refactor.
//
// Moderation cases and leveling progress used to live inside each server's settings
// document (`infractions` and `leveling.users`). They now have their own collections
// (see tools/models). This script copies the data over, sets up the case counters and
// then removes the old arrays from the settings documents.
//
//   npm run migrate -- --dry-run     # show what would happen, change nothing
//   npm run migrate                  # migrate
//   npm run migrate -- --keep-old    # migrate but leave the old arrays in place
//
// It uses the collections for the bot mode in config.json (prod/custom or dev/test),
// so run it once per mode you use. Safe to run more than once.
require("dotenv").config();
const mongoose = require("mongoose");

const dryRun = process.argv.includes("--dry-run");
const keepOld = process.argv.includes("--keep-old");

const ServerSettings = require("../tools/SettingsSchema");
const Case = require("../tools/models/Case");
const LevelMember = require("../tools/models/LevelMember");
const Counter = require("../tools/models/Counter");

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

async function migrateGuild(doc, totals) {
  const guildId = doc._id;
  const infractions = Array.isArray(doc.infractions) ? doc.infractions : [];
  const levelUsers = Array.isArray(doc.leveling?.users) ? doc.leveling.users : [];
  if (infractions.length === 0 && levelUsers.length === 0) return;

  // Cases. Old case ids could collide (they were "array length + 1"), so duplicates
  // get new numbers after the highest existing one.
  const used = new Set();
  let maxId = infractions.reduce((max, inf) => Math.max(max, toNumber(inf.id)), 0);
  const cases = [];
  let renumbered = 0;
  for (const inf of infractions) {
    let caseId = toNumber(inf.id);
    if (caseId < 1 || used.has(caseId)) {
      caseId = ++maxId;
      renumbered++;
    }
    used.add(caseId);
    cases.push({
      guildId,
      caseId,
      punishment: inf.punishment ?? "Unknown",
      member: inf.member,
      moderator: inf.moderator,
      reason: inf.reason || "No reason specified",
      expiretime: toNumber(inf.expiretime),
      expired: Boolean(inf.expired),
      hidden: Boolean(inf.hidden),
      modlogID: inf.modlogID ?? undefined,
      creationDate: toNumber(inf.creationDate, 0) || undefined,
    });
  }

  // Levels: if a user somehow appears twice, keep their best entry.
  const levels = new Map();
  for (const u of levelUsers) {
    if (!u?.id) continue;
    const entry = { level: toNumber(u.level), xp: toNumber(u.xp) };
    const prev = levels.get(u.id);
    if (!prev || entry.level > prev.level || (entry.level === prev.level && entry.xp > prev.xp)) levels.set(u.id, entry);
  }

  totals.guilds++;
  totals.cases += cases.length;
  totals.levels += levels.size;
  totals.renumbered += renumbered;
  console.log(`${guildId}: ${cases.length} cases${renumbered ? ` (${renumbered} renumbered)` : ""}, ${levels.size} levels`);
  if (dryRun) return;

  if (cases.length) {
    await Case.bulkWrite(
      cases.map(({ guildId: _g, caseId, ...fields }) => ({
        // Filter fields are copied into new documents by MongoDB, so they aren't repeated here.
        updateOne: { filter: { guildId, caseId }, update: { $setOnInsert: fields }, upsert: true },
      })),
      { ordered: false },
    );
    await Counter.updateOne({ _id: `case:${guildId}` }, { $max: { seq: maxId } }, { upsert: true });
  }
  if (levels.size) {
    await LevelMember.bulkWrite(
      [...levels].map(([userId, entry]) => ({
        updateOne: { filter: { guildId, userId }, update: { $setOnInsert: entry }, upsert: true },
      })),
      { ordered: false },
    );
  }
  if (!keepOld) {
    await ServerSettings.collection.updateOne({ _id: guildId }, { $unset: { infractions: "", "leveling.users": "" } });
  }
}

async function main() {
  if (!process.env.mongourl) throw new Error("mongourl is not set in .env");
  await mongoose.connect(process.env.mongourl);
  console.log(`Connected. Settings collection: ${ServerSettings.collection.collectionName}${dryRun ? " (dry run)" : ""}`);

  if (!dryRun) {
    await Promise.all([Case.createIndexes(), LevelMember.createIndexes()]);
  }

  const totals = { guilds: 0, cases: 0, levels: 0, renumbered: 0 };
  // Read straight from the collection: the schema no longer knows about these fields.
  const cursor = ServerSettings.collection.find(
    { $or: [{ "infractions.0": { $exists: true } }, { "leveling.users.0": { $exists: true } }] },
    { projection: { infractions: 1, "leveling.users": 1 } },
  );
  for await (const doc of cursor) {
    try {
      await migrateGuild(doc, totals);
    }
    catch (err) {
      console.error(`Failed to migrate ${doc._id}:`, err.message);
      totals.failed = (totals.failed ?? 0) + 1;
    }
  }

  console.log(
    `\nDone. ${totals.guilds} servers, ${totals.cases} cases (${totals.renumbered} renumbered), ${totals.levels} levels.` +
    `${totals.failed ? ` ${totals.failed} failed.` : ""}${dryRun ? " Nothing was changed (dry run)." : ""}`,
  );
  await mongoose.disconnect();
  process.exit(totals.failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
