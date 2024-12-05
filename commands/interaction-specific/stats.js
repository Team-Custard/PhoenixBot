// const { isMessageInstance } = require('@sapphire/discord.js-utilities');
const { BucketScope } = require("@sapphire/framework");
const { Subcommand } = require("@sapphire/plugin-subcommands");
const serverSettings = require("../../tools/SettingsSchema");
const { EmbedBuilder, Colors } = require("discord.js");
const os = require("os");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "stats",
      subcommands: [
        {
          name: "about",
          chatInputRun: "chatInputAbout",
        },
        {
          name: "usage",
          chatInputRun: "chatInputUsage",
        },
        {
          name: "systeminfo",
          chatInputRun: "chatInputSystem",
        },
        {
          name: "dbfix",
          chatInputRun: "chatInputFixDB",
        },
      ],
      cooldownDelay: 15_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("stats")
        .setDescription("Shows bot stats")
        .addSubcommand((command) =>
          command.setName("about").setDescription("Displays bot info."),
        )
        .addSubcommand((command) =>
          command
            .setName("usage")
            .setDescription("Displays current memory usage and storage."),
        )
        .addSubcommand((command) =>
          command.setName("systeminfo").setDescription("Displays system info."),
        )
        .addSubcommand((command) =>
          command
            .setName("dbfix")
            .setDescription("Creates your server database if none exists."),
        )
        .setDMPermission(false),
    );
  }

  async chatInputSystem(interaction) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setDescription(
        `**Device info:**\nOperating system: ${os.type()} (${os.release()})\nMemory: About ${Math.floor(os.totalmem() / 1000000000)}gb\nStorage: Idk :/\nNode version: ${process.version}\nUptime: ${Math.floor(process.uptime())} seconds`,
      );
    await interaction.reply({ embeds: [embed] });
  }

  async chatInputUsage(interaction) {
    await interaction.reply(
      `Currently using ${Math.floor((os.totalmem() - os.freemem()) * 0.000001)}mb of available ram. ${Math.floor(os.freemem() * 0.000001)}mb is left until the bot crashes.`,
    );
  }

  async chatInputAbout(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("About PhoenixBot")
      .setDescription(
        `PhoenixBot is an open-source bot by SylveonDev that adds extended functionality to your account and your servers, and providing useful tools like translations and verification.\n\nUptime: Booted <t:${Math.floor((Date.now() - this.container.client.uptime) / 1000)}:R>\nCached guilds: ${this.container.client.guilds.cache.size}\nCached users: ${this.container.client.users.cache.size}`,
      )
      .setThumbnail("https://phoenix.sylveondev.xyz/phoenixlogo.png")
      .setColor(Colors.Orange)
      .setTimestamp(new Date());
    await interaction.reply({ embeds: [embed] });
  }

  async chatInputFixDB(interaction) {
    await interaction.deferReply();
    let db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    if (db) {
      return interaction.followUp(
        `Database is fine. No further action needed.`,
      );
    }
    db = new serverSettings({ _id: interaction.guild.id });

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Looks like the server database does not exist. I have recreated it successfully! Errors should be fixed now.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
