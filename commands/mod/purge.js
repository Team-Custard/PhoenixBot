const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

const limitArg = {
  name: "limit",
  type: "integer",
  required: true,
  minValue: 1,
  maxValue: 100,
  description: "How many messages to look through (1-100)",
};

class PurgeCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "clean",
      aliases: ["purge", "p", "clear"],
      description: "Bulk deletes messages in the channel.",
      examples: ["purge 50", "purge user 20 sylveondev", "purge bots 30"],
      subcommands: [
        { name: "all", description: "Deletes any message", args: [limitArg], run: "purgeAll", default: true },
        {
          name: "user",
          description: "Deletes messages from one user",
          args: [limitArg, { name: "user", type: "user", required: true, description: "Whose messages to delete" }],
          run: "purgeUser",
        },
        { name: "bots", description: "Deletes messages sent by bots", args: [limitArg], run: "purgeBots" },
      ],
      slash: { name: "purge" },
      cooldownDelay: 30_000,
      cooldownScope: BucketScope.Guild,
      suggestedUserPermissions: [PermissionFlagsBits.ManageMessages],
      requiredClientPermissions: [PermissionFlagsBits.ManageMessages],
      preconditions: ["module"],
    });
  }

  purgeAll(ctx, { limit }) {
    return this.purge(ctx, limit, () => true);
  }

  purgeUser(ctx, { limit, user }) {
    return this.purge(ctx, limit, (msg) => msg.author.id === user.id);
  }

  purgeBots(ctx, { limit }) {
    return this.purge(ctx, limit, (msg) => msg.author.bot);
  }

  async purge(ctx, limit, filter) {
    // Ephemeral so the bot's own "thinking" reply isn't part of what gets deleted.
    await ctx.defer({ ephemeral: true });
    const messages = await ctx.channel.messages.fetch({
      limit,
      before: ctx.isSlash ? undefined : ctx.message.id,
      cache: false,
    });
    const purged = await ctx.channel.bulkDelete(messages.filter(filter), true);
    return ctx.reply(`${emoji("success")} Deleted **${purged.size}** messages.`);
  }
}

module.exports = { PurgeCommand };
