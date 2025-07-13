const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope, ApplicationCommandRegistry } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "verification",
      aliases: ["verify"],
      description: "Configures verification settings.",
      detailedDescription: {
        usage: "verification [subcommand] <role> [messagetext] [verifiedtext]",
        examples: [
          "verification display",
          'verification set @verified "Click below to verified" "Welcome to the server, {{mention}}',
          "verification clear",
        ],
        args: [
          "subcommand: The subcommand",
          "role: The verified role",
          "messagetext: The text of the verification panel",
          "verifiedtext: The successfully verified response text",
        ],
      },
      subcommands: [
        {
          name: "attach",
          chatInputRun: "chatInputAttach",
          messageRun: "messageAttach",
          default: true,
        },
        {
          name: "verify",
          chatInputRun: "chatInputVerify",
          messageRun: "messageVerify",
        },
        {
          name: "setup",
          chatInputRun: "chatInputSet",
          messageRun: "messageSet",
        },
        {
          name: "clear",
          chatInputRun: "chatInputClear",
          messageRun: "messageClear",
        },
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  /**
   * 
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("verification")
        .setDescription("Commands to settings up verification")
        .addSubcommand((command) =>
          command
            .setName("attach")
            .setDescription("Displays the verification message to an embed")
            .addStringOption(option => option.setName('message_id').setDescription('The id of the message to attach to').setRequired(true))
            .addStringOption(option => option.setName('label').setDescription('The label to use on the button').setMaxLength(16).setMinLength(1).setRequired(false))
        )
        .addSubcommand((command) =>
          command
            .setName("verify")
            .setDescription("Manually verifies a member")
            .addUserOption(option => option.setName('member').setDescription('The member to verify').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('The reason for verifying the user').setRequired(false))
        )
        .addSubcommand((command) =>
          command
            .setName("setup")
            .setDescription("Configures verification settings")
            .addRoleOption((option) =>
              option
                .setName("verified_role")
                .setDescription("The verified role")
                .setRequired(true),
            )
            .addRoleOption((option) =>
              option
                .setName("manager_role")
                .setDescription("The role that can verify people")
                .setRequired(true),
            )
            .addRoleOption((option) =>
              option
                .setName("unverified_role")
                .setDescription("The unverified role")
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("verified_text")
                .setDescription("The message to use after verification")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("clear")
            .setDescription("Clears verification settings"),
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(32),
    );
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputVerify(interaction) {
    await interaction.deferReply();

    const member = await interaction.options.getMember('member');
    const reason = await interaction.options.getString('reason') || 'No reason specified'

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    
    if (interaction.member.roles.cache.has(db.verification.managerRole)) return interaction.followUp(`${this.container.emojis.error} You are missing the manager role required to verify members.`)
    if (!db.verification.verifiedRole) return interaction.followUp(`${this.container.emojis.error} Verification is not setup.`)

    if (member.roles.cache.has(db.verification.unverifiedRole)) return interaction.followUp(`${this.container.emojis.error} The user is already verified.`)

    if (db.verification.unverifiedRole) member.roles.remove(db.verification.unverifiedRole, `Role swapping`);

    member.roles.add(db.verification.verifiedRole, `(Verified by ${interaction.user.tag}) ${reason}`);

    interaction.followUp(`${this.container.emojis.success} Verified **${member.user.tag}**.`);
  }
  async messageVerify(interaction, args) {
    const member = await args.pick('member');
    const reason = await args.rest('reason') || 'No reason specified'

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    
    if (message.member.roles.cache.has(db.verification.managerRole)) return message.reply(`${this.container.emojis.error} You are missing the manager role required to verify members.`)
    if (!db.verification.verifiedRole) return message.reply(`${this.container.emojis.error} Verification is not setup.`)

    if (member.roles.cache.has(db.verification.unverifiedRole)) return message.reply(`${this.container.emojis.error} The user is already verified.`)

    if (db.verification.unverifiedRole) member.roles.remove(db.verification.unverifiedRole, `Role swapping`);

    member.roles.add(db.verification.verifiedRole, `(Verified by ${message.author.tag}) ${reason}`);

    message.reply(`${this.container.emojis.success} Verified **${member.user.tag}**.`);
  }
  

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputAttach(interaction) {
    await interaction.deferReply();

    const messageid = await interaction.options.getString('message_id');

    const message = await interaction.channel.messages.fetch(messageid);

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify")
        .setLabel(await interaction.options.getString('label') || 'Verify')
        .setStyle(ButtonStyle.Primary),
    );

    message.edit({ components: [button] });

    interaction.followUp({ content: `${this.container.emojis.success} Attached verification button to the message.` });
  }

  async chatInputSet(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const role = await interaction.options.getRole("verified_role");
    const managerrole = await interaction.options.getRole("manager_role");
    const unverifiedrole = await interaction.options.getRole("unverified_role");
    const messagetext = await interaction.options.getString(
      "message_text",
      false,
    );
    const verifiedtext = await interaction.options.getString(
      "verified_text",
      false,
    );

    db.verification.role = role.id;
    managerrole ? (db.verification.managerRole = managerrole?.id) : null;
    unverifiedrole ? (db.verification.unverifiedRole = unverifiedrole?.id) : null;
    messagetext ? (db.verification.messageText = messagetext) : null;
    verifiedtext ? (db.verification.verifiedText = verifiedtext) : null;

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Successfully setup verification.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputClear(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    db.verification.role = "";
    db.verification.managerRole = "";
    db.verification.unverifiedRole = "";
    db.verification.messageText = "";
    db.verification.verifiedText = "";

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Successfully cleared verification settings.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageAttach(message, args) {
    const messageid = await args.pick('string');

    const msg = await message.channel.messages.fetch(messageid);

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify")
        .setLabel(await args.pick('string').catch('Verify'))
        .setStyle(ButtonStyle.Primary),
    );

    msg.edit({ components: [button] });

    message.reply({ content: `${this.container.emojis.success} Attached verification button to the message.` });
  }

  async messageSet(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const role = await args.pick("role");
    const managerrole = await args.pick("role");
    const unverifiedrole = await args.pick("role").catch(() => undefined);
    const verifiedtext = await args.pick("string").catch(() => undefined);

    db.verification.role = role.id;
    managerrole ? (db.verification.managerRole = managerrole?.id) : null;
    unverifiedrole ? (db.verification.unverifiedRole = unverifiedrole?.id) : null;
    messagetext ? (db.verification.messageText = messagetext) : null;
    verifiedtext ? (db.verification.verifiedText = verifiedtext) : null;

    db.save()
      .then(() => {
        message.reply(`${this.container.emojis.success} Successfully setup verification.`);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageClear(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    db.verification.role = "";
    db.verification.managerRole = "";
    db.verification.unverifiedRole = "";
    db.verification.messageText = "";
    db.verification.verifiedText = "";

    db.save()
      .then(() => {
        message.reply(
          `${this.container.emojis.success} Successfully cleared verification settings.`,
        );
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
