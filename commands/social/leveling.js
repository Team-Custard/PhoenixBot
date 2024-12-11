const { ChatInputCommandInteraction, PermissionFlagsBits, PermissionsBitField, Message, EmbedBuilder, Colors } = require("discord.js");
const settings = require("../../tools/SettingsSchema");
const { emojibar } = require("emoji-progressbar");
const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope, ApplicationCommandRegistry } = require("@sapphire/framework");
const search = require("youtube-search");
const calculateLevel = require("../../tools/xpToLevel");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "leveling",
      aliases: ["lvl", 'level'],
      description: "Commands relating to leveling.",
      detailedDescription: {
        usage: "leveling [subcommand] [option]",
        examples: [
          "leveling toggle on",
          "leveling rank",
          "leveling rewards",
        ],
        args: [
          "subcommand: The subcommand. Defaults to rank.",
          "option: The option to the subcommand",
        ],
      },
      subcommands: [
        {
          name: "toggle",
          chatInputRun: "chatInputToggle",
          messageRun: "messageToggle",
        },
        {
          name: "rank",
          chatInputRun: "chatInputRank",
          messageRun: "messageRank",
          default: true,
        },
        {
            name: "set_level",
            chatInputRun: "chatInputSetLevel",
            messageRun: "messageSetLevel"
        },
        {
          name: "set_message",
          chatInputRun: "chatInputSetMessage",
          messageRun: "messageSetMessage"
        },
        {
          name: "reward",
          type: "group",
          entries: [
            {name: `list`, chatInputRun: `chatInputListReward`, messageRun: `messageListReward`},
            {name: `add`, chatInputRun: `chatInputAddReward`, messageRun: `messageAddReward`},
            {name: `remove`, chatInputRun: `chatInputRemoveReward`, messageRun: `messageRemoveReward`},
          ]
        },
        {
          name: "clear",
          type: "group",
          entries: [
            {name: `user`, chatInputRun: `chatInputClearUser`, messageRun: `messageClearUser`, default: true},
            {name: `all`, chatInputRun: `chatInputClearAll`, messageRun: `messageClearAll`}
          ],
          default: true,
        },
      ],
      cooldownDelay: 30_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      preconditions: ["module"],
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
        .setName("leveling")
        .setDescription("Leveling related commands")
        .addSubcommand((command) =>
          command
            .setName("toggle")
            .setDescription("This toggles if users should gain levels in the server")
        )
        .addSubcommand((command) =>
          command
            .setName("rank")
            .setDescription("Displays a member's rank card")
            .addUserOption((option) =>
              option
                .setName("member")
                .setDescription("The member to search")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("set_level")
            .setDescription("Sets the member's level")
            .addUserOption((option) =>
              option
                .setName("member")
                .setDescription("The member to set")
                .setRequired(true),
            )
            .addIntegerOption((option) => option.setName("level").setDescription("The level to assign").setRequired(true))
          )
        .addSubcommand((command) =>
          command
            .setName("set_message")
            .setDescription("Sets the level up message")
            .addStringOption((option) =>
              option
                .setName("message")
                .setDescription("The message to set as the level up message. Leave empty to disable.")
                .setRequired(true),
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to post level up messages to. Leave blank to post in the current channel.")
                .setRequired(false),
            )
          )
          .addSubcommandGroup((group) => group
            .setName(`rewards`)
            .setDescription(`Level role management`)
            .addSubcommand(command => command
              .setName(`list`)
              .setDescription(`Shows all the current level roles in the server.`)
            )
            .addSubcommand(command => command
              .setName(`add`)
              .setDescription(`Creates a level role`)
              .addRoleOption(option => option
                .setName("role")
                .setDescription("The role to assign.")
                .setRequired(true)
              )
              .addIntegerOption(option => option
                .setName("level")
                .setDescription("The level to give the role at.")
                .setRequired(true)
              )
            )
            .addSubcommand(command => command
              .setName(`remove`)
              .setDescription(`Removes a level role`)
              .addRoleOption(option => option
                .setName("role")
                .setDescription("The role to remove.")
                .setRequired(true)
              )
            )
          )
          .addSubcommandGroup((group) => group
            .setName(`clear`)
            .setDescription(`Clears the levels from someone`)
            .addSubcommand(command => command
              .setName(`user`)
              .setDescription(`Resets a user's level back to zero.`)
              .addUserOption(option => option
                .setName(`member`)
                .setDescription(`The member to clear`)
              )
            )
            .addSubcommand(command => command
              .setName(`all`)
              .setDescription(`Clears the entire server's levels`)
            )
          )
        .setDMPermission(false),
    );
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRank(interaction) {
    let member = interaction.options.getMember('member');
    if (!member) member = interaction.member;
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    const level = db.leveling.users.find(u => u.id == member.user.id);
    if (!level) return interaction.followUp(`${this.container.emojis.info} No level exists for this user yet. Keep chatting to gain levels.`)
    const embed = new EmbedBuilder()
    .setAuthor({
      name: member.displayName,
      iconURL: member.displayAvatarURL({ dynamic: true })
    })
    .setThumbnail(member.displayAvatarURL({ dynamic: true }))
    .setColor(Colors.Orange)
    .setTimestamp(new Date())
    .setDescription(`**Level ${level.level}**\n${emojibar('🟧', '🟧', '🟧', '⬛', '⬛', '⬛', level.xp, calculateLevel(level.level), 10)}\n${level.xp} / ${ calculateLevel(level.level)}xp`)
    await interaction.followUp({embeds: [embed]});
  }
  async messageRank(message, args) {
    let member = await args.pick('member').catch(() => message.member);
    const db = await settings.findById(message.guild.id).cacheQuery();
    const level = db.leveling.users.find(u => u.id == member.user.id);
    if (!level) return message.reply(`${this.container.emojis.info} No level exists for this user yet. Keep chatting to gain levels.`)
    const embed = new EmbedBuilder()
    .setAuthor({
      name: member.displayName,
      iconURL: member.displayAvatarURL({ dynamic: true })
    })
    .setThumbnail(member.displayAvatarURL({ dynamic: true }))
    .setColor(Colors.Orange)
    .setTimestamp(new Date())
    .setDescription(`**Level ${level.level}**\n${emojibar('🟧', '🟧', '🟧', '⬛', '⬛', '⬛', level.xp, calculateLevel(level.level), 10)}\n${level.xp} / ${ calculateLevel(level.level)}xp`)
    await message.reply({embeds: [embed]});
  }
  
  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputToggle(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`, ephemeral: true});
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    db.leveling.enable = !db.leveling.enable;
    await db.save();
    interaction.followUp(`${this.container.emojis.success} ${db.leveling.enable ? `Enabled leveling. Users will now start leveling up.` : `Disabled leveling. Users won't gain any new xp from chatting.`}`);
  }
  async messageToggle(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const db = await settings.findById(message.guild.id).cacheQuery();
    db.leveling.enable = !db.leveling.enable;
    await db.save();
    message.reply(`${this.container.emojis.success} ${db.leveling.enable ? `Enabled leveling. Users will now start leveling up.` : `Disabled leveling. Users won't gain any new xp from chatting.`}`);
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputSetLevel(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`, ephemeral: true});
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    let member = interaction.options.getMember('member');
    let level = interaction.options.getInteger('level');
    const userlevel = db.leveling.users.find(u => u.id == member.id);
    if (!userlevel) return interaction.followUp(`${this.container.emojis.error} This user does not yet have a level. They need to chat first before you can set their level.`)
    userlevel.level = level;
    userlevel.xp = 0;
    await db.save();
    interaction.followUp(`${this.container.emojis.success} Set **${member.user.tag}**'s level to \` ${level} \` successfully.`)
  }
  async messageSetLevel(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const db = await settings.findById(message.guild.id).cacheQuery();
    let member = await args.pick('member');
    let level = await args.pick('integer');
    const userlevel = db.leveling.users.find(u => u.id == member.id);
    if (!userlevel) return message.reply(`${this.container.emojis.error} This user does not yet have a level. They need to chat first before you can set their level.`)
    userlevel.level = level;
    userlevel.xp = 0;
    await db.save();
    message.reply(`${this.container.emojis.success} Set **${member.user.tag}**'s level to \` ${level} \` successfully.`)
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputSetMessage(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`, ephemeral: true});
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    let message = interaction.options.getString('message');
    let channel = interaction.options.getChannel('channel');
    if (!message) {
      db.leveling.message = null;
      await db.save();
      interaction.followUp(`${this.container.emojis.success} Disabled the leveling message.`)
    } else {
      db.leveling.message = message;
      db.leveling.announceChannel = channel?.id;
      await db.save();
      interaction.followUp(`${this.container.emojis.success} Set the leveling message successfully.`)
    }
  }
  async messageSetMessage(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const db = await settings.findById(message.guild.id).cacheQuery();
    let channel = await args.pick('channel').catch(() => undefined);
    let msg = await args.rest('string').catch(() => undefined);
    console.log(msg);
    console.log(channel);
    if (!message) {
      db.leveling.message = null;
      await db.save();
      message.reply(`${this.container.emojis.success} Disabled the leveling message.`)
    } else {
      db.leveling.message = msg;
      db.leveling.announceChannel = channel?.id;
      console.log(db.leveling);
      await db.save();
      message.reply(`${this.container.emojis.success} Set the leveling message successfully.`)
    }
  }

  

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputClearUser(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can clear levels.`, ephemeral: true});
    const member = interaction.options.getMember('member');
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    if (!db.leveling.users.find(u => u.id == member.user.id)) return interaction.followUp(`${this.container.emojis.error} The specified user doesn't exist in the leveling database.`)
    db.leveling.users.splice(db.leveling.users.indexOf({id: member.user.id}), 1);
    await db.save();
    interaction.followUp(`${this.container.emojis.success} Reset ${member.user.tag}'s level.`);
  }
  async chatInputClearUser(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const member = await args.pick('member');
    const db = await settings.findById(message.guild.id).cacheQuery();
    if (!db.leveling.users.find(u => u.id == member.user.id)) return message.reply(`${this.container.emojis.error} The specified user doesn't exist in the leveling database.`)
    db.leveling.users.splice(db.leveling.users.indexOf({id: member.user.id}), 1);
    await db.save();
    message.reply(`${this.container.emojis.success} Reset ${member.user.tag}'s level.`);
  }
  
  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputClearAll(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can clear levels.`, ephemeral: true});
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    db.leveling.users = [];
    await db.save();
    interaction.followUp(`${this.container.emojis.success} Cleared the server's levels.`);
  }
  async messageClearAll(interaction) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const db = await settings.findById(message.guild.id).cacheQuery();
    db.leveling.users = [];
    await db.save();
    message.reply(`${this.container.emojis.success} Cleared the server's levels.`);
  }
}
module.exports = {
  PingCommand,
};
