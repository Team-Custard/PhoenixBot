const os = require("os");
const { EmbedBuilder, Colors, InteractionContextType } = require("discord.js");
const { createSlashGroup } = require("../../tools/SlashGroup");
const { emoji } = require("../../tools/errorReporter");
const { initGuildDatabase } = require("../../tools/database");
const ServerSettings = require("../../tools/SettingsSchema");

const mb = (bytes) => `${Math.round(bytes / 1024 / 1024)}mb`;

/** Sums a number across every cluster (falls back to this cluster only). */
async function acrossClusters(client, fn) {
  try {
    const results = await client.cluster.broadcastEval(fn);
    return results.reduce((a, b) => a + b, 0);
  }
  catch {
    return fn(client);
  }
}

const StatsGroup = createSlashGroup({
  name: "stats",
  description: "Shows bot stats",
  contexts: [InteractionContextType.Guild],
  subcommands: [
    {
      name: "about",
      description: "Displays bot info",
      run: async (ctx) => {
        const client = ctx.client;
        const [guilds, users] = await Promise.all([
          acrossClusters(client, (c) => c.guilds.cache.size),
          acrossClusters(client, (c) => c.guilds.cache.reduce((n, g) => n + (g.memberCount ?? 0), 0)),
        ]);
        const embed = new EmbedBuilder()
          .setTitle("About PhoenixBot")
          .setDescription(
            `PhoenixBot is an open-source bot by SylveonDev that adds extended functionality to your account and your servers, and providing useful tools like translations and verification.\n\n` +
            `Uptime: Booted <t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>\nServers: ${guilds}\nMembers: ${users}\nCluster: ${client.cluster?.id ?? 0}`,
          )
          .setThumbnail("https://phoenix.sylveondev.xyz/phoenixlogo.png")
          .setColor(Colors.Orange)
          .setTimestamp(new Date());
        return ctx.reply({ embeds: [embed] });
      },
    },
    {
      name: "usage",
      description: "Displays current memory usage",
      run: (ctx) => {
        const memory = process.memoryUsage();
        return ctx.reply(
          `This cluster is using ${mb(memory.rss)} of memory (${mb(memory.heapUsed)} heap). The machine has ${mb(os.freemem())} of ${mb(os.totalmem())} free.`,
        );
      },
    },
    {
      name: "systeminfo",
      description: "Displays system info",
      run: (ctx) => {
        const embed = new EmbedBuilder()
          .setColor(Colors.Orange)
          .setDescription(
            `**Device info:**\nOperating system: ${os.type()} (${os.release()})\nMemory: About ${Math.round(os.totalmem() / 1e9)}gb\nNode version: ${process.version}\nUptime: ${Math.floor(process.uptime())} seconds`,
          );
        return ctx.reply({ embeds: [embed] });
      },
    },
    {
      name: "dbfix",
      description: "Creates your server database if none exists",
      run: async (ctx) => {
        if (!ctx.guild) return ctx.error(`${emoji("error")} This only works in a server.`);
        const exists = await ServerSettings.exists({ _id: ctx.guild.id });
        if (exists) return ctx.reply("Database is fine. No further action needed.");
        await initGuildDatabase(ctx.guild.id);
        return ctx.reply(`${emoji("success")} Looks like the server database does not exist. I have recreated it successfully! Errors should be fixed now.`);
      },
    },
  ],
});

module.exports = { StatsGroup };
