const { Schema, model } = require("mongoose");

// Leveling progress, one document per member per server. This used to be an array
// inside the settings document that was rewritten on every message.
const levelMemberSchema = new Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
  },
  { versionKey: false },
);

levelMemberSchema.index({ guildId: 1, userId: 1 }, { unique: true });
levelMemberSchema.index({ guildId: 1, level: -1, xp: -1 });

const collection = require("../config").usesProdCollections ? "levelmembers" : "levelmembersStaging";
module.exports = model(collection, levelMemberSchema);
