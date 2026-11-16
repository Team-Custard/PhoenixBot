const { ScheduledTask } = require("@sapphire/plugin-scheduled-tasks");
const { removeMistakeRole } = require("../tools/counting");

// Takes the "too many wrong numbers" role off again (see tools/counting.js).
class CountingRoleTask extends ScheduledTask {
  constructor(context, options) {
    super(context, { ...options, name: "countingRole" });
  }

  run(payload) {
    return removeMistakeRole(this.container.client, payload);
  }
}

module.exports = { CountingRoleTask };
