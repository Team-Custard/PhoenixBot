const { Schema, model } = require("mongoose");
const { SpeedGooseCacheAutoCleaner } = require("speedgoose");
const Counter = require("./Counter");

// Moderation cases used to live in an ever-growing array inside each server's
// settings document. They now get their own collection so loading settings stays
// cheap and case numbers can be assigned atomically.
const caseSchema = new Schema(
  {
    guildId: { type: String, required: true },
    caseId: { type: Number, required: true },
    punishment: String,
    member: String,
    moderator: String,
    reason: String,
    // Unix seconds; 0 when the punishment doesn't expire.
    expiretime: { type: Number, default: 0 },
    expired: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    modlogID: String,
    // Unix seconds.
    creationDate: { type: Number, default: () => Math.round(Date.now() / 1000) },
  },
  { versionKey: false },
).plugin(SpeedGooseCacheAutoCleaner);

caseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
caseSchema.index({ guildId: 1, member: 1, punishment: 1 });

/** Reserves the next case number for a server. */
caseSchema.statics.nextCaseId = async function(guildId) {
  const key = `case:${guildId}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  if (counter.seq !== 1) return counter.seq;

  // A fresh counter: make sure it starts after any cases that already exist
  // (e.g. a counter that was lost or never initialised by the migration).
  const last = await this.findOne({ guildId }).sort({ caseId: -1 }).select("caseId").lean();
  if (!last) return 1;
  const fixed = await Counter.findOneAndUpdate(
    { _id: key },
    { $max: { seq: last.caseId + 1 } },
    { new: true },
  );
  return fixed.seq;
};

/**
 * Creates a case with the next available case number.
 * @param {string} guildId
 * @param {object} data Case fields (punishment, member, moderator, reason, ...)
 */
caseSchema.statics.open = async function(guildId, data) {
  const caseId = await this.nextCaseId(guildId);
  return this.create({ ...data, guildId, caseId });
};

caseSchema.statics.findCase = function(guildId, caseId) {
  return this.findOne({ guildId, caseId });
};

/** Number of active (not pardoned) warnings a member has. */
caseSchema.statics.countWarnings = function(guildId, memberId) {
  return this.countDocuments({ guildId, member: memberId, punishment: "Warn" });
};

const collection = require("../config").usesProdCollections ? "cases" : "casesStaging";
module.exports = model(collection, caseSchema);
