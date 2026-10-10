const { Listener } = require("@sapphire/framework");

class ScheduledTaskStrategyClientError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "scheduledTaskStrategyClientError" });
  }

  run(error) {
    console.error(`[error] Scheduled task client error`, error);
  }
}
module.exports = { ScheduledTaskStrategyClientError };
