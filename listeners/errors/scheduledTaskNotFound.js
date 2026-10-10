const { Listener } = require("@sapphire/framework");

class ScheduledTaskNotFound extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "scheduledTaskNotFound" });
  }

  run(task) {
    console.warn(`[warning] Scheduled task ${task} was not found`);
  }
}
module.exports = { ScheduledTaskNotFound };
