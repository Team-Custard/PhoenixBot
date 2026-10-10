const { Listener } = require("@sapphire/framework");

class ScheduledTaskStrategyWorkerError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "scheduledTaskStrategyWorkerError" });
  }

  run(error) {
    console.error(`[error] Scheduled task worker error`, error);
  }
}
module.exports = { ScheduledTaskStrategyWorkerError };
