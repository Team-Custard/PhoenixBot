const { Precondition } = require("@sapphire/framework");
const { PermissionsBitField } = require("discord.js");
const ServerSettings = require("../tools/SettingsSchema");

/**
 * Per-server command rules set on the dashboard:
 * - disabled commands can't be used at all
 * - permission overrides let a role use a command without its usual permission
 * - otherwise the member needs one of the command's suggestedUserPermissions
 */
class ModulePrecondition extends Precondition {
  async messageRun(message, command) {
    if (!message.guild) return this.ok();
    return this.check(command, message.guild.id, message.member);
  }

  async chatInputRun(interaction, command) {
    // DMs and user-installed contexts in servers the bot isn't in.
    if (!interaction.guild || !interaction.member?.roles?.cache) return this.ok();
    if (!interaction.authorizingIntegrationOwners?.[0]) return this.ok();
    return this.check(command, interaction.guild.id, interaction.member);
  }

  async contextMenuRun(interaction, command) {
    if (!interaction.guild || !interaction.member?.roles?.cache) return this.ok();
    if (!interaction.authorizingIntegrationOwners?.[0]) return this.ok();
    return this.check(command, interaction.guild.id, interaction.member);
  }

  /**
   * @param {import("@sapphire/framework").Command} command
   * @param {string} guildId
   * @param {import("discord.js").GuildMember} member
   */
  async check(command, guildId, member) {
    const name = command.name;
    if (name === "toggle") return this.ok();

    const db = await ServerSettings.findById(guildId)
      .select("disabledCommands permissionOverrides")
      .lean()
      .cacheQuery();

    if (db?.disabledCommands?.includes(name)) {
      return this.error({
        message: "Sorry, this command has been disabled by the server admins",
        context: { silent: true },
      });
    }

    const needed = command.options.suggestedUserPermissions;
    if (!needed?.length) return this.ok();
    if (needed.some((permission) => member.permissions.has(new PermissionsBitField(permission)))) return this.ok();

    const granted = (db?.permissionOverrides ?? []).some(
      (override) => member.roles.cache.has(override.role_id) && override.grant?.includes(name),
    );
    if (granted) return this.ok();

    return this.error({
      message: `You are missing the needed permissions or role to use this command. You need the following permissions to use this command: **${new PermissionsBitField(needed).toArray().join(", ")}**`,
    });
  }
}

module.exports = {
  ModulePrecondition,
};
