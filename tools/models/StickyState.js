const { Schema, model } = require("mongoose");

// The sticky message Phoenix last posted in each channel, so it can be deleted when
// it's reposted, even after a restart.
const stickyStateSchema = new Schema(
  {
    // bot id + ":" + channel id
    _id: { type: String, required: true },
    guildId: String,
    messageId: String,
  },
  { versionKey: false },
);

const collection = require("../config").usesProdCollections ? "stickystates" : "stickystatesStaging";
module.exports = model(collection, stickyStateSchema);
