const { Schema, model } = require("mongoose");

// When each timed message was last posted, so timers carry on after a restart.
const timedStateSchema = new Schema(
  {
    // guild id + a hash of the timed message
    _id: { type: String, required: true },
    guildId: String,
    lastSentAt: Date,
  },
  { versionKey: false },
);

const collection = require("../config").usesProdCollections ? "timedstates" : "timedstatesStaging";
module.exports = model(collection, timedStateSchema);
