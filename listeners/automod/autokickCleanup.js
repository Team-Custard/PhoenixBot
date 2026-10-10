const { Listener } = require("@sapphire/framework");
const { cancelMemberTask } = require("../../tools/tasks");

// Drops a pending autokick when the member leaves on their own.
class AutokickCleanup extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberRemove", name: "autokickCleanup" });
  }

  run(member) {
    return cancelMemberTask("autoKick", member.guild.id, member.id);
  }
}

module.exports = { AutokickCleanup };
