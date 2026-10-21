const { Schema, model } = require("mongoose");

// A reminder set with /remind. Deleted once it's been delivered or cancelled.
const reminderSchema = new Schema(
  {
    userId: { type: String, required: true },
    guildId: String,
    channelId: String,
    // The message to reply to: the bot's answer to /remind, or the prefix command.
    replyTo: String,
    text: String,
    dm: { type: Boolean, default: false },
    dueAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

reminderSchema.index({ userId: 1, dueAt: 1 });
reminderSchema.index({ dueAt: 1 });

const collection = require("../config").usesProdCollections ? "reminders" : "remindersStaging";
module.exports = model(collection, reminderSchema);
