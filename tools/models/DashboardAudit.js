const { Schema, model } = require("mongoose");

// Who changed what on the dashboard, shown on the dashboard's Audit log page.
// Entries are kept for 180 days.
const auditSchema = new Schema(
  {
    guildId: { type: String, required: true },
    userId: String,
    username: String,
    avatar: String,
    action: String,
    summary: String,
    changes: [{
      _id: false,
      key: String,
      label: String,
      type: { type: String },
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    }],
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

auditSchema.index({ guildId: 1, createdAt: -1 });
auditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 86_400 });

const collection = require("../config").usesProdCollections ? "dashboardaudits" : "dashboardauditsStaging";
module.exports = model(collection, auditSchema);
