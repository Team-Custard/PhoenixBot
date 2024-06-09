const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const UserDB = require("../../tools/UserDB");
const config = require("../../config.json");

const {
  REST,
  Routes,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Colors,
} = require("discord.js");

// Create the Modal here so the set command works better.
const modal = new ModalBuilder()
  .setTitle("UserDB configuration")
  .setCustomId("userdbModal");

const inputRowA = new ActionRowBuilder().addComponents(
  new TextInputBuilder()
    .setCustomId("timezoneField")
    .setPlaceholder("America/New_York")
    .setMaxLength(42)
    .setRequired(false)
    .setStyle(TextInputStyle.Short)
    .setLabel(`Your timezone (optional)`),
);
const inputRowB = new ActionRowBuilder().addComponents(
  new TextInputBuilder()
    .setCustomId("pronounField")
    .setPlaceholder("they/them")
    .setMaxLength(12)
    .setRequired(false)
    .setStyle(TextInputStyle.Short)
    .setLabel(`Your pronouns (optional)`),
);
const inputRowC = new ActionRowBuilder().addComponents(
  new TextInputBuilder()
    .setCustomId("descriptionField")
    .setPlaceholder("Hello, I'm a Phoenix user.")
    .setMaxLength(120)
    .setRequired(false)
    .setStyle(TextInputStyle.Paragraph)
    .setLabel(`Your description (optional)`),
);
const inputRowD = new ActionRowBuilder().addComponents(
  new TextInputBuilder()
    .setCustomId("youtubeField")
    .setPlaceholder("@sylveondev")
    .setMaxLength(24)
    .setRequired(false)
    .setStyle(TextInputStyle.Short)
    .setLabel(`Your youtube social (optional)`),
);
const inputRowE = new ActionRowBuilder().addComponents(
  new TextInputBuilder()
    .setCustomId("twitterField")
    .setPlaceholder("@sylveondev")
    .setMaxLength(24)
    .setRequired(false)
    .setStyle(TextInputStyle.Short)
    .setLabel(`Your twitter social (optional)`),
);
/* const inputRowF = new ActionRowBuilder()
        .addComponents(new TextInputBuilder()
        .setCustomId('redditField').setPlaceholder('u/sylveondev').setMaxLength(24).setRequired(false).setStyle(TextInputStyle.Short).setLabel(`Your reddit social (optional)`));
        const inputRowG = new ActionRowBuilder()
        .addComponents(new TextInputBuilder()
        .setCustomId('serverField').setPlaceholder('JC3WAcxFq6').setMaxLength(12).setRequired(false).setStyle(TextInputStyle.Short).setLabel(`Your server invite (optional)`)); */

modal.addComponents(inputRowA, inputRowB, inputRowC, inputRowD, inputRowE);

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "userdb",
      subcommands: [
        {
          name: "timefor",
          chatInputRun: "chatInputTimefor",
        },
        {
          name: "pronouns",
          chatInputRun: "chatInputPronouns",
        },
        {
          name: "afk",
          chatInputRun: "chatInputAfk",
        },
        {
          name: "set",
          chatInputRun: "chatInputSet",
        },
        {
          name: "display",
          chatInputRun: "chatInputDisplay",
        },
        {
          name: "clear",
          chatInputRun: "chatInputClear",
        },
      ],
      cooldownDelay: 30_000,
      cooldownLimit: 5,
      cooldownScope: BucketScope.User,
    });
  }

  registerApplicationCommands(registry) {
    if (config.userdb.global) {
      registry.registerChatInputCommand((builder) =>
        builder
          .setName("userdb")
          .setDescription("UserDB commands")
          .addSubcommand((command) =>
            command
              .setName("timefor")
              .setDescription("Displays what time it is for a user.")
              .addUserOption((option) =>
                option
                  .setName("user")
                  .setDescription("The member to fetch")
                  .setRequired(false),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("pronouns")
              .setDescription("Displays user's pronouns.")
              .addUserOption((option) =>
                option
                  .setName("user")
                  .setDescription("The member to fetch")
                  .setRequired(false),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("afk")
              .setDescription(
                "Sets afk status which members will see when they ping.",
              )
              .addStringOption((option) =>
                option
                  .setName("reason")
                  .setDescription(
                    "The reason you are going afk, users who pings you will recieve this message.",
                  )
                  .setRequired(true),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("set")
              .setDescription(
                "Displays a modal to configure your UserDB settings.",
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("display")
              .setDescription("Displays a member's UserDB page.")
              .addUserOption((option) =>
                option
                  .setName("user")
                  .setDescription("The member to fetch")
                  .setRequired(true),
              ),
          )
          .addSubcommand((command) =>
            command
              .setName("clear")
              .setDescription("Clears all your UserDB settings"),
          )
          .setDMPermission(false),
      );

      const rest = new REST().setToken(this.container.client.token);
      rest
        .get(Routes.applicationCommands(this.container.client.id))
        .then((res) => {
          // console.log(res);
          if (!res.find((r) => r.name == "Time for user")) {
            console.log("Registering timefor command");
            rest
              .post(Routes.applicationCommands(this.container.client.id), {
                body: {
                  name: "Time for user",
                  type: 2,
                  integration_types: [1],
                  contexts: [0, 1, 2],
                },
              })
              .then(() => {
                console.log(
                  "User command timefor message registered successfully.",
                );
              })
              .catch((err) =>
                console.log(
                  "User command timefor message failed. It probably already exists.",
                  err,
                ),
              );
          }
          if (!res.find((r) => r.name == "setup_userdb")) {
            console.log("Registering set command");
            rest
              .post(Routes.applicationCommands(this.container.client.id), {
                body: {
                  name: "setup_userdb",
                  description: "User installed version of userdb set",
                  type: 1,
                  integration_types: [1],
                  contexts: [0, 1, 2],
                },
              })
              .then(() => {
                console.log(
                  "User command set message registered successfully.",
                );
              })
              .catch((err) =>
                console.log(
                  "User command set message failed. It probably already exists.",
                  err,
                ),
              );
          }
        });
    }
  }

  async chatInputSet(interaction) {
    interaction.showModal(modal);
  }

  async chatInputTimefor(interaction) {
    await interaction.deferReply();
    let member = await interaction.options.getMember("user");

    if (!member) member = interaction.member;

    const usersettings = await UserDB.findById(
      member.user.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings)
      return interaction.followUp(
        `:x: **${member.user.username}** does not have a timezone set.`,
      );
    if (!usersettings.timezone)
      return interaction.followUp(
        `:x: **${member.user.username}** does not have a timezone set.`,
      );

    const moment = require("moment-timezone");
    const date = new Date();
    const strTime = moment(date).tz(usersettings.timezone).format("hh:mm:ss");
    const strDate = moment(date).tz(usersettings.timezone).format("MM-DD-YYYY");
    await interaction.followUp(
      `**${member.user.username}**'s time is **${strTime}** (${strDate}).`,
    );
  }

  async chatInputPronouns(interaction) {
    await interaction.deferReply();
    let member = await interaction.options.getMember("user");

    if (!member) member = interaction.member;

    const usersettings = await UserDB.findById(
      member.user.id,
      UserDB.upsert,
    ).cacheQuery();

    if (!usersettings)
      return interaction.followUp(
        `:x: **${member.user.username}** does not have pronouns set through UserDB.`,
      );
    if (!usersettings.pronouns)
      return interaction.followUp(
        `:x: **${member.user.username}** does not have pronouns set through UserDB.`,
      );

    await interaction.followUp(
      `**${member.user.username}**'s pronouns are **${usersettings.pronouns}**.`,
    );
  }

  async chatInputDisplay(interaction) {
    const member = await interaction.options.getMember("user");
    if (member.user.bot)
      return interaction.reply(":x: Bots can't be added to UserDB.");
    await interaction.deferReply();
    const usersettings = await UserDB.findById(
      member.user.id,
      UserDB.upsert,
    ).cacheQuery();
    let embed;
    if (usersettings) {
      embed = new EmbedBuilder()
        .setTitle(member.user.username)
        .setDescription(
          `**ID:** ${member.user.id}\n**UserDB registered:** :white_check_mark: Yes\n\n__**UserDB info:**__\n**Timezone:** ${usersettings.timezone ? usersettings.timezone : "Unset"}\n**Pronouns:** ${usersettings.pronouns ? usersettings.pronouns : "Unset"}\n**Description:** ${usersettings.description ? usersettings.description : "Unset"}\n\n__**Socials:**__\n**Youtube:** ${usersettings.socials.youtube ? `[${usersettings.socials.youtube}](https://youtube.com/${usersettings.socials.youtube})` : "Unset"}\n**Twitter:** ${usersettings.socials.twitter ? `[${usersettings.socials.twitter}](https://twitter.com/${usersettings.socials.twitter})` : "Unset"}`,
        )
        .setColor(Colors.Orange)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp(new Date());
    } else {
      embed = new EmbedBuilder()
        .setTitle(member.user.username)
        .setDescription(
          `**ID:** ${member.user.id}\n**UserDB registered:** :x: No, use </userdb set:${interaction.commandId}>.`,
        )
        .setColor(Colors.Orange)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))

        .setTimestamp(new Date());
    }

    interaction.followUp({ embeds: [embed] });
  }

  async chatInputAfk(interaction) {
    await interaction.deferReply();
    let usersettings = await UserDB.findById(
      interaction.member.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings)
      usersettings = new UserDB({ _id: interaction.member.id });
    const reason = await interaction.options.getString("reason");

    usersettings.afk.since = Math.floor(new Date().getTime() / 1000);
    usersettings.afk.status = reason;

    usersettings
      .save()
      .then(() => {
        interaction.followUp({
          content: `:white_check_mark: You are now afk. To remove your afk status, simply send a message in the server.`,
          ephemeral: false,
        });
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputClear(interaction) {
    await interaction.deferReply();
    UserDB.findByIdAndDelete(interaction.member.id)
      .then(() => {
        interaction.followUp({
          content: `:white_check_mark: Deleted your UserDB configuration successfully.`,
          ephemeral: false,
        });
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
  modal,
};
