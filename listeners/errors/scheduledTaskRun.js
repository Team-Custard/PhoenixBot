const { Listener } = require("@sapphire/framework");

class ScheduledTaskRun extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "scheduledTaskRun" });
  }

  run(task) {
    console.log(`Running task ${task.name}`);
  }
}
module.exports = { ScheduledTaskRun };
