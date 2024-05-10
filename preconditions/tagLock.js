const { Precondition } = require('@sapphire/framework');
const serverSettings = require('../tools/SettingsSchema');
const { PermissionFlagsBits } = require('discord.js');


class tagLockPrecondition extends Precondition {
  async messageRun(message) {
    // for Message Commands
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
    const db = await serverSettings.findById(member.guild.id, serverSettings.upsert).cacheQuery();
    if (!db.lockTags) return this.okay();
    return member.permissions.has(PermissionFlagsBits.ManageGuild)
      ? this.ok()
      : this.error({ message: 'Sorry, this server has disabled the ability to create tags for members.' });
  }
}
module.exports = {
  tagLockPrecondition
};