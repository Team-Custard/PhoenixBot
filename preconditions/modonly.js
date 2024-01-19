const { Precondition } = require('@sapphire/framework');
const database = require("../Tools/SettingsSchema");
const { PermissionFlagsBits } = require('discord.js');

class ModOnlyPrecondition extends Precondition {
    async messageRun(message) {
        // for Message Commands
        return this.checkMod(message);
    }
    async checkMod(message) {
        const serverdb = await database.findById(message.guild.id).exec();
        if (serverdb.modonly == false) return this.ok();
        return message.member.permissions.has(PermissionFlagsBits.BanMembers)
          ? this.ok()
          : this.error({ message: 'User is not a moderator.', context: { silent: true } });
    }
}
module.exports = {
  ModOnlyPrecondition
};