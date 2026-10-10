const { Precondition } = require("@sapphire/framework");

class BotModPrecondition extends Precondition {
  async messageRun(message) {
    // for Message Commands
    if (!message.member) return this.error({ message: "This command is bot admin only" });
    return this.checkLockStatus(message.member);
  }

  async chatInputRun(interaction) {
    // for Slash Commands
    return this.checkLockStatus(interaction.member);
  }

  async contextMenuRun(interaction) {
    // for Context Menu Command
    return this.checkLockStatus(interaction.member);
  }

  async checkLockStatus(member) {
    if (member.guild.id != "1251025316701405284") return this.error({ message: "This command cannot be ran outside the Phoenix support server" });
    return member.roles.cache.has("1276464446264573995")
      ? this.ok()
      : this.error({ message: "This command is bot admin only" });
  }
}
module.exports = {
  BotModPrecondition,
};
