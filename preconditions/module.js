const { Precondition, Command } = require("@sapphire/framework");
const serverSettings = require("../tools/SettingsSchema");
const { PermissionFlagsBits, Message, InteractionContextType, ApplicationCommandType, Guild, GuildMember, PermissionsBitField } = require("discord.js");

class tagLockPrecondition extends Precondition {

  /**
   * 
   * @param {Message} message
   * @returns 
   */
  async messageRun(message, command) {
    // for Message Commands
    return this.checkLockStatus(command.name, message.guild, message.member, command);
  }

  /**
   * 
   * @param {import("discord.js").Interaction} interaction 
   * @param {*} command 
   * @returns 
   */
  async chatInputRun(interaction, command) {
    // for Slash Commands
    console.log(interaction.authorizingIntegrationOwners)
    if (!interaction.guild) return this.ok();
    if (!interaction.authorizingIntegrationOwners[0]) return this.ok();
    return this.checkLockStatus(command.name, interaction.guild, interaction.member, command);
  }

  async contextMenuRun(interaction, command) {
    // for Context Menu Command
    if (!interaction.authorizingIntegrationOwners[0]) return this.ok();
    return this.checkLockStatus(command.name, interaction.guild, interaction.member, command);
  }

  /**
   * @param {String} module 
   * @param {Guild} guild 
   * @param {GuildMember} member 
   * @param {Command} command
   */
  async checkLockStatus(module, guild, member, command) {
    const db = await serverSettings
      .findById(guild.id, serverSettings.upsert)
      .cacheQuery();
    if (module == "toggle") return this.ok();
    let allowedCommand = false;
    for (let i = 0; i < member.roles.cache.size; i++) {
      let role = member.roles.cache.at(i);
      const grants = db.permissionOverrides.find(r => r.role_id == role.id);
      if (grants) {
        if (grants.grant.find(g => g == module)) {
          console.log('Grant passed');
          allowedCommand = true;
        }
      }
    }

    if (command.options.suggestedUserPermissions) {
      for (let i = 0; i < command.options.suggestedUserPermissions.length; i++) {
        const permission = command.options.suggestedUserPermissions.at(i);
        if (member.permissions.has(new PermissionsBitField(permission))) allowedCommand = true;
      }
    } else allowedCommand = true;
    
    if (db.disabledCommands.find(c => c == module)) this.error({ message: "Sorry, this command has been disabled by the server admins", context: {silent: true} })
    
    return !allowedCommand
      ? this.error({ message: `You are missing the needed permissions or role to use this command. You need the following permissions to use this command: **${new PermissionsBitField(command.options.suggestedUserPermissions).toArray().join(", ")}**`})
      : this.ok();
  }
}
module.exports = {
  tagLockPrecondition,
};
