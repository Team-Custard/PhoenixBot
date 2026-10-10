const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");

class PingCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "ping",
      aliases: ["latency"],
      description: "Checks that the bot is alive and how fast it responds.",
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  async run(ctx) {
    const sent = await ctx.reply({ content: "Pinging... Please wait", ephemeral: true });
    const diff = (sent?.createdTimestamp ?? Date.now()) - ctx.source.createdTimestamp;
    const heartbeat = Math.round(this.container.client.ws.ping);
    return ctx.editReply(`🏓 Pong! (Round trip took: ${diff}ms. Heartbeat: ${heartbeat}ms.)`, sent);
  }
}

module.exports = { PingCommand };
