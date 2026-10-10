const { Listener } = require("@sapphire/framework");

class ScheduledTaskSuccess extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "scheduledTaskSuccess" });
  }

  run(task, _payload, _result, duration) {
    console.log(`Task ${task.name} succeeded in ${Math.round(duration)}ms`);
  }
}
module.exports = { ScheduledTaskSuccess };
