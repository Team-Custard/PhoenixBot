const { Listener } = require("@sapphire/framework");

class ScheduledTaskFinished extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "scheduledTaskFinished" });
  }

  run(task) {
    console.log(`Finished task ${task.name}`);
  }
}
module.exports = { ScheduledTaskFinished };
