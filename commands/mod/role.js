const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const { checkHierarchy } = require("../../tools/moderation");

const memberRoleArgs = (verb) => [
  { name: "member", type: "member", required: true, description: `The member to ${verb}` },
  { name: "role", type: "role", required: true, description: "The role" },
  { name: "reason", type: "string", rest: true, maxLength: 400, description: "The reason for the change" },
];

class RoleCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "role",
      aliases: ["rolemod", "editrole"],
      description: "Adds or removes a member's role. The role whitelist is managed on the dashboard.",
      examples: ["role add sylveondev member", "role remove sylveondev muted"],
      subcommands: [
        { name: "add", description: "Adds a role to a member", args: memberRoleArgs("give the role to"), run: "addRole" },
        { name: "remove", description: "Removes a role from a member", args: memberRoleArgs("take the role from"), run: "removeRole" },
      ],
      cooldownDelay: 15_000,
      cooldownScope: BucketScope.Guild,
      suggestedUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],
      preconditions: ["module"],
    });
  }

  async check(ctx, member, role, adding) {
    if (member.id === ctx.user.id) {
      return `${emoji("error")} You can't ${adding ? "give yourself roles" : "remove roles from yourself"} with this command.`;
    }
    const hierarchy = checkHierarchy(ctx.member, member, "manage");
    if (hierarchy) return hierarchy;
    if (role.managed || role.id === ctx.guild.id) return `${emoji("error")} That role can't be ${adding ? "given out" : "removed"} manually.`;
    if (ctx.member.id !== ctx.guild.ownerId && role.position >= ctx.member.roles.highest.position) {
      return `${emoji("error")} You aren't high enough in the role hierarchy to ${adding ? "hand out" : "take away"} this role.`;
    }
    if (role.position >= ctx.guild.members.me.roles.highest.position) {
      return `${emoji("error")} I can't ${adding ? "hand out" : "take away"} this role because it's above my highest role. Move my role above it in the roles list.`;
    }
    if (adding && member.roles.cache.has(role.id)) return `${emoji("error")} This user already has the role you're trying to add.`;
    if (!adding && !member.roles.cache.has(role.id)) return `${emoji("error")} This user doesn't have the role you're trying to remove.`;

    const settings = await getSettings(ctx.guild.id);
    if (settings.whitelistedRoles?.length > 0 && !settings.whitelistedRoles.includes(role.id)) {
      return `${emoji("error")} This role is not in the whitelist.`;
    }
    return null;
  }

  async addRole(ctx, { member, role, reason }) {
    const problem = await this.check(ctx, member, role, true);
    if (problem) return ctx.reply(problem);
    await member.roles.add(role, `(Role added by ${ctx.user.tag}) ${reason || "No reason specified"}`);
    return ctx.reply({ content: `${emoji("success")} Added ${role} to **${member.user.tag}**.`, allowedMentions: { parse: [] } });
  }

  async removeRole(ctx, { member, role, reason }) {
    const problem = await this.check(ctx, member, role, false);
    if (problem) return ctx.reply(problem);
    await member.roles.remove(role, `(Role removed by ${ctx.user.tag}) ${reason || "No reason specified"}`);
    return ctx.reply({ content: `${emoji("success")} Removed ${role} from **${member.user.tag}**.`, allowedMentions: { parse: [] } });
  }
}

module.exports = { RoleCommand };
