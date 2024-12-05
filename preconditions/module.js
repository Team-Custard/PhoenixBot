const { Precondition } = require("@sapphire/framework");
const serverSettings = require("../tools/SettingsSchema");
const { PermissionFlagsBits, Message } = require("discord.js");

class tagLockPrecondition extends Precondition {

  /**
   * 
   * @param {Message} message
   * @returns 
   */
  async messageRun(message, command) {
    // for Message Commands
    return this.checkLockStatus(command.fullCategory, message.guild);
  }

  async chatInputRun(interaction, command) {
    // for Slash Commands
    return this.checkLockStatus(command.fullCategory, interaction.guild);
  }

  async contextMenuRun(interaction, command) {
    // for Context Menu Command
    return this.checkLockStatus(command.fullCategory, interaction.guild);
  }

  async checkLockStatus(module, guild) {
    const db = await serverSettings
      .findById(guild.id, serverSettings.upsert)
      .cacheQuery();
    if (module == "config" || module == "dev" || module == "interaction-specific") return this.ok();
    return db.modules[module+"Plugin"]
      ? this.ok()
      : this.error({ message: "This command module is disabled" });
  }
}
module.exports = {
  tagLockPrecondition,
};
