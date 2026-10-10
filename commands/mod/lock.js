const { PermissionFlagsBits, PermissionsBitField, ChannelType } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { setTimeout: sleep } = require("node:timers/promises");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

const LOCKED_PERMISSIONS = ["SendMessages", "SendMessagesInThreads", "Connect", "Speak"];

class LockCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "lock",
      aliases: ["l", "lockdown"],
      description: "Locks a channel or the whole server.",
      examples: ["lock", "lock channel #general", "lock server", "lock unlock"],
      subcommands: [
        {
          name: "channel",
          description: "Locks a channel",
          default: true,
          run: "lockChannel",
          args: [{
            name: "channel",
            type: "channel",
            description: "The channel to lock (defaults to this one)",
            channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum, ChannelType.GuildStageVoice, ChannelType.GuildAnnouncement, ChannelType.GuildMedia],
          }],
        },
        { name: "server", aliases: ["all"], description: "Locks the whole server", run: "lockServer" },
        { name: "unlock", aliases: ["end"], description: "Ends the server lockdown, or unlocks this channel", run: "unlock" },
        { name: "fixperms", description: "Fixes roles that would let members talk during a server lockdown", run: "fixPerms" },
      ],
      slash: { name: "lockdown" },
      cooldownDelay: 30_000,
      cooldownScope: BucketScope.Guild,
      suggestedUserPermissions: [PermissionFlagsBits.ManageChannels],
      requiredClientPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
      preconditions: ["module"],
    });
  }

  async lockChannel(ctx, { channel }) {
    const target = channel ?? ctx.channel;
    const everyone = ctx.guild.roles.everyone;
    if (!target.permissionsFor(everyone).has(PermissionFlagsBits.SendMessages)) {
      return ctx.reply(`${emoji("error")} This channel is already locked.`);
    }
    await ctx.defer();
    await target.permissionOverwrites.edit(
      everyone,
      Object.fromEntries(LOCKED_PERMISSIONS.map((p) => [p, false])),
      `(Lock by ${ctx.user.tag})`,
    );
    return ctx.reply(`${emoji("success")} **${target.name}** has been locked until \`lock unlock\` is used.`);
  }

  async lockServer(ctx) {
    const everyone = ctx.guild.roles.everyone;
    if (!everyone.permissions.has(PermissionFlagsBits.SendMessages)) {
      return ctx.reply(`${emoji("error")} The server is already locked.`);
    }
    await ctx.defer();
    const permissions = new PermissionsBitField(everyone.permissions).remove(LOCKED_PERMISSIONS);
    await everyone.setPermissions(permissions, `(Lock by ${ctx.user.tag})`);
    return ctx.reply(`${emoji("success")} The server has been locked until \`lock unlock\` is used.`);
  }

  async unlock(ctx) {
    const everyone = ctx.guild.roles.everyone;
    await ctx.defer();
    if (!everyone.permissions.has(PermissionFlagsBits.SendMessages)) {
      const permissions = new PermissionsBitField(everyone.permissions).add(LOCKED_PERMISSIONS);
      await everyone.setPermissions(permissions, `(Unlock by ${ctx.user.tag})`);
      return ctx.reply(`${emoji("success")} The server lockdown has ended.`);
    }
    if (ctx.channel.permissionsFor(everyone).has(PermissionFlagsBits.SendMessages)) {
      return ctx.reply(`${emoji("error")} There is no active lockdown.`);
    }
    await ctx.channel.permissionOverwrites.edit(
      everyone,
      Object.fromEntries(LOCKED_PERMISSIONS.map((p) => [p, null])),
      `(Unlock by ${ctx.user.tag})`,
    );
    return ctx.reply(`${emoji("success")} **${ctx.channel.name}** lockdown has ended.`);
  }

  async fixPerms(ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply(`${emoji("error")} You need the **Manage Roles** permission to use this.`);
    }
    const progress = await ctx.reply(`${emoji("loading")} **Please wait...**`);
    const roles = await ctx.guild.roles.fetch();
    let successes = 0;
    for (const role of roles.values()) {
      if (role.id === ctx.guild.id || role.managed || !role.editable) continue;
      const permissions = new PermissionsBitField(role.permissions);
      if (!LOCKED_PERMISSIONS.some((p) => permissions.has(p))) continue;
      const result = await role
        .setPermissions(permissions.remove(LOCKED_PERMISSIONS), "Fixing role permissions for lockdown")
        .catch(() => undefined);
      if (result) successes++;
      await sleep(1000);
    }
    return ctx.editReply(`${emoji("success")} Successfully fixed the permissions for ${successes} roles.`, progress);
  }
}

module.exports = { LockCommand };
