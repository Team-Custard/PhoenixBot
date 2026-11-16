const { Schema, model } = require("mongoose");

// Where each server's counting channel is at (tools/counting.js).
const countingStateSchema = new Schema(
  {
    // The server's id.
    _id: { type: String, required: true },
    // The channel this count belongs to; a new channel starts over.
    channelId: String,
    count: { type: Number, default: 0 },
    lastUserId: String,
    highScore: { type: Number, default: 0 },
    highScoreAt: Number,
    // Recent wrong numbers, for the "too many mistakes" role.
    mistakes: [{ _id: false, userId: String, at: Number }],
  },
  { versionKey: false },
);

const collection = require("../config").usesProdCollections ? "countingstates" : "countingstatesStaging";
module.exports = model(collection, countingStateSchema);
