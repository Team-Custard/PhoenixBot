const { Schema, model } = require("mongoose");

// One account Phoenix watches for the notifications module (tools/notifications),
// shared by every server that follows it. `guilds` lists those servers; the
// notification settings themselves stay in each server's settings.
const notificationFeedSchema = new Schema(
  {
    // platform + ":" + account, like "youtube:@phoenix" or "twitch:phoenix".
    _id: { type: String, required: true },
    platform: String,
    account: String,
    guilds: [String],
    // What the account turned out to be (like a YouTube channel id) and its name.
    resolvedId: String,
    name: String,
    // Ids of the latest posts, so each is only announced once.
    seen: [String],
    // False until the first check, which only records what's already there.
    primed: { type: Boolean, default: false },
    // The live stream being announced right now (Twitch, YouTube).
    live: { id: String, at: Number },
    // YouTube streams that are scheduled but haven't started.
    pending: [{ _id: false, id: String, until: Number }],
    lastChecked: { type: Number, default: 0 },
    lastError: String,
    errorCount: { type: Number, default: 0 },
  },
  { versionKey: false },
);

notificationFeedSchema.index({ guilds: 1 });

const collection = require("../config").usesProdCollections ? "notificationfeeds" : "notificationfeedsStaging";
module.exports = model(collection, notificationFeedSchema);
