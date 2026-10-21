const { ScheduledTask } = require("@sapphire/plugin-scheduled-tasks");
const Reminder = require("../tools/models/Reminder");
const { deliver } = require("../tools/reminders");

// Sends a reminder set with /remind when it comes due.
class ReminderTask extends ScheduledTask {
  constructor(context, options) {
    super(context, { ...options, name: "reminder" });
  }

  async run(payload) {
    // Cancelled reminders are deleted, so there's nothing to send.
    const reminder = await Reminder.findById(payload?.id).lean().catch(() => null);
    if (!reminder) return;
    await deliver(reminder);
  }
}

module.exports = { ReminderTask };
