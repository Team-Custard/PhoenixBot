const { Command } = require("@sapphire/framework");
const {
  ApplicationCommandType,
  EmbedBuilder,
  Colors,
  PermissionFlagsBits,
} = require("discord.js");

class UserCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "userinfo",
      aliases: ["info", "whois"],
      description: "Displays info on a user.",
      detailedDescription: {
        usage: "userinfo [user]",
        examples: ["userinfo sylveondev"],
        args: [
          "name: The name of the emoji to use.",
          "emoji: The emoji, or url",
        ],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1223311343768305794", "1223311342207762482"];
    registry
      .registerContextMenuCommand((builder) =>
        builder
          .setName("Display info")
          .setType(ApplicationCommandType.User)
          .setDMPermission(false),
      )
      .registerChatInputCommand((builder) =>
        builder
          .setName("display_info")
          .setDescription("Displays information of a user.")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("The member to lookup")
              .setRequired(true),
          )
          .setDMPermission(false),
      );
  }

  async contextMenuRun(interaction) {
    await interaction.deferReply();
    const member = interaction.targetMember;
    const embed = new EmbedBuilder()
      .setAuthor({
        name: member.user.displayName + (member.user.bot ? `[BOT]` : ``),
        iconURL: member.user.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `**Tag:** ${member.user.tag}\n${member.nickname ? `**Nickname:** ${member.nickname}\n` : ``}**Display Name:**: ${member.user.displayName}\n**ID:** ${member.user.id}\n**Joined server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n**Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n\n**Roles:** ${member.roles.cache.map((r) => r)}\n**Passed Onboarding:** ${member.pending ? "No" : "Yes"}\n**Boosting:** ${member.premiumSinceTimestamp ? `Yes, started boosting <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : `No`}`,
      )
      .setColor(member.roles.highest.color)
      .setFooter({ text: "Triggered" })
      .setTimestamp(new Date());
    await interaction.followUp({ embeds: [embed] });
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();
    const member = await interaction.options.getMember("user");
    if (member) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: member.user.displayName + (member.user.bot ? `[BOT]` : ``),
          iconURL: member.user.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**Tag:** ${member.user.tag}\n${member.nickname ? `**Nickname:** ${member.nickname}\n` : ``}**Display Name:**: ${member.user.displayName}\n**ID:** ${member.user.id}\n**Joined server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n**Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n\n**Roles:** ${member.roles.cache.map((r) => r)}\n**Passed Onboarding:** ${member.pending ? "No" : "Yes"}\n**Boosting:** ${member.premiumSinceTimestamp ? `Yes, started boosting <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : `No`}`,
        )
        .setColor(member.roles.highest.color)
        .setFooter({ text: "Triggered" })
        .setTimestamp(new Date());
      await interaction.followUp({ embeds: [embed] });
    } else {
      // Fetch the user instead, they don't exist.
      const user = await interaction.options.getUser("user");
      const embed = new EmbedBuilder()
        .setAuthor({
          name: user.displayName + (user.bot ? `[BOT]` : ``),
          iconURL: user.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**Tag:** ${user.tag}\n**ID:** ${user.id}\n**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>\nNot in this server.`,
        )
        .setColor(Colors.Orange)
        .setFooter({ text: "Triggered" })
        .setTimestamp(new Date());
      await interaction.followUp({ embeds: [embed] });
    }
  }

  async messageRun(message, args) {
    const user = await args.pick("user").catch(() => message.author);
    const member = await message.guild.members
      .fetch(user.id)
      .catch(() => undefined);
    if (member) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: member.user.displayName + (member.user.bot ? `[BOT]` : ``),
          iconURL: member.user.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**Tag:** ${member.user.tag}\n${member.nickname ? `**Nickname:** ${member.nickname}\n` : ``}**Display Name:**: ${member.user.displayName}\n**ID:** ${member.user.id}\n**Joined server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n**Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n\n**Roles:** ${member.roles.cache.map((r) => r)}\n**Passed Onboarding:** ${member.pending ? "No" : "Yes"}\n**Boosting:** ${member.premiumSinceTimestamp ? `Yes, started boosting <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : `No`}`,
        )
        .setColor(member.roles.highest.color)
        .setFooter({ text: "Triggered" })
        .setTimestamp(new Date());
      await message.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: user.displayName + (user.bot ? `[BOT]` : ``),
          iconURL: user.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**Tag:** ${user.tag}\n**ID:** ${user.id}\n**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>\nNot in this server.`,
        )
        .setColor(Colors.Orange)
        .setFooter({ text: "Triggered" })
        .setTimestamp(new Date());
      await message.reply({ embeds: [embed] });
    }
  }
}
module.exports = {
  UserCommand,
};
