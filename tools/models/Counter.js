const { Schema, model } = require("mongoose");

// Atomic sequence counters, e.g. `case:<guildId>` for per-server case numbers.
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const collection = require("../config").usesProdCollections ? "counters" : "countersStaging";
module.exports = model(collection, counterSchema);
