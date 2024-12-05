const { Command } = require("@sapphire/framework");
const {
  ApplicationCommandType,
  EmbedBuilder,
  Colors,
  PermissionFlagsBits,
  GuildMemberFlags,
  ChatInputCommandInteraction,
} = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class UserCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "serverinfo",
      aliases: ["si", "server", "guildinfo"],
      description: "Displays info on the server.",
      detailedDescription: {
        usage: "serverinfo [id]",
        examples: ["serverinfo"],
        args: [
          "id: The id of a server",
        ],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      preconditions: ["module"]
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1223311343768305794", "1223311342207762482"];
    registry
      .registerChatInputCommand((builder) =>
        builder
          .setName("server_info")
          .setDescription("Displays information of a server.")
          .addStringOption((option) =>
            option
              .setName("server")
              .setDescription("The server id to lookup")
              .setRequired(false),
          )
          .setDMPermission(false),
      );
  }

  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRun(interaction) {
    await interaction.deferReply();
    const guildid = await interaction.options.getString("server");
    let guild = interaction.guild;
    if (guildid) {
        const fetchedGuild = await this.container.client.guilds.fetch(guildid).catch(() => undefined);
        if (fetchedGuild) return interaction.followUp(`${this.container.emojis.error} The specified server was not found.`);
        guild = fetchedGuild;
    }

    const embed = new EmbedBuilder()
    .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({dynamic:true, size: 512})
    })
    .setDescription(`**Name:** ${guild.name}\n`+
        `**ID:** ${guild.id}\n`+
        `**Owner:** <@${guild.ownerId}>\n`+
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n`+
        `**Shard:** ${guild.shardId}\n`+
        `**Premium:** ${await require("../../tools/premiumCheck")(guild) ? this.container.emojis.success : this.container.emojis.error}\n` +
        `\n**Users:** ${guild.memberCount} / ${guild.maximumMembers}\n`+
        `**Roles:** ${guild.roles.cache.size} / 250\n`+
        `**Channels:** ${guild.channels.cache.size} / 250\n`+
        `**Emojis:** ${guild.emojis.cache.filter(e => e.animated == false).size} / ${guild.premiumTier == 3 ? 250 : (guild.premiumTier == 2 ? 150 : (guild.premiumTier == 3 ? 100 : 50))}\n`+
        `**Boosts:** ${guild.premiumSubscriptionCount} (Level ${guild.premiumTier})\n`+
        `\n**Verification:** ${guild.verificationLevel} / 4\n`+
        `**Explicit filter:** ${guild.explicitContentFilter} / 2\n`+
        `**Notifications:** ${guild.defaultMessageNotifications == 1 ? `@mention` : `all`}`
    )
    .setThumbnail(guild.iconURL({dynamic:true, size: 512}))
    .setColor(Colors.Orange)
    .setFooter({ text: `Triggered` })
    .setTimestamp(new Date());
    
    interaction.followUp({ embeds: [embed] });
  }

  async messageRun(message, args) {
    const guild = await args.pick("guild").catch(() => message.guild);

    const embed = new EmbedBuilder()
    .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({dynamic:true, size: 512})
    })
    .setDescription(`**Name:** ${guild.name}\n`+
        `**ID:** ${guild.id}\n`+
        `**Owner:** <@${guild.ownerId}>\n`+
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n`+
        `**Shard:** ${guild.shardId}\n`+
        `**Premium:** ${await require("../../tools/premiumCheck")(guild) ? this.container.emojis.success : this.container.emojis.error}\n` +
        `\n**Users:** ${guild.memberCount} / ${guild.maximumMembers}\n`+
        `**Roles:** ${guild.roles.cache.size} / 250\n`+
        `**Channels:** ${guild.channels.cache.size} / 250\n`+
        `**Emojis:** ${guild.emojis.cache.filter(e => e.animated == false).size} / ${guild.premiumTier == 3 ? 250 : (guild.premiumTier == 2 ? 150 : (guild.premiumTier == 3 ? 100 : 50))}\n`+
        `**Boosts:** ${guild.premiumSubscriptionCount} (Level ${guild.premiumTier})\n`+
        `\n**Verification:** ${guild.verificationLevel} / 4\n`+
        `**Explicit filter:** ${guild.explicitContentFilter} / 2\n`+
        `**Notifications:** ${guild.defaultMessageNotifications == 1 ? `@mention` : `all`}`
    )
    .setThumbnail(guild.iconURL({dynamic:true, size: 512}))
    .setColor(Colors.Orange)
    .setFooter({ text: `Triggered` })
    .setTimestamp(new Date());

    message.reply({ embeds: [embed] });
  }
}
module.exports = {
  UserCommand,
};
