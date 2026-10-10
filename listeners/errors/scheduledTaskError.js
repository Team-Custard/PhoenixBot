const { Listener } = require("@sapphire/framework");
const { report } = require("../../tools/errorReporter");

class ScheduledTaskError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "scheduledTaskError" });
  }

  run(error, task) {
    return report(`Error occured while running the scheduled task ${task?.name ?? "unknown"}`, error);
  }
}
module.exports = { ScheduledTaskError };
