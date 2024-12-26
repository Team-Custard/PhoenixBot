const premiumCheck = require("../../tools/premiumCheck");

const { ChatInputCommandInteraction, PermissionFlagsBits, PermissionsBitField, Message, EmbedBuilder, Colors } = require("discord.js");
const settings = require("../../tools/SettingsSchema");
const { emojibarv2 } = require("emoji-progressbar");
const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope, ApplicationCommandRegistry, Args } = require("@sapphire/framework");
const { PaginatedMessage } = require("@sapphire/discord.js-utilities");
const search = require("youtube-search");
const calculateLevel = require("../../tools/xpToLevel");
const fs = require('fs');

const { RankCardBuilder, Font } = require("canvacord");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "leveling",
      aliases: ["lvl", 'level', 'rank'],
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
          name: "set_background",
          chatInputRun: "chatInputSetBackground",
          messageRun: "messageSetBackground"
        },
        {
          name: "set_embeds",
          chatInputRun: "chatInputSetLegacy",
          messageRun: "messageSetLegacy"
        },
        {
          name: "rewards",
          type: "group",
          entries: [
            {name: `list`, chatInputRun: `chatInputListReward`, messageRun: `messageListReward`, default: true},
            {name: `add`, chatInputRun: `chatInputAddReward`, messageRun: `messageAddReward`},
            {name: `remove`, chatInputRun: `chatInputRemoveReward`, messageRun: `messageRemoveReward`},
            {name: `set_stacking`, chatInputRun: `chatInputStackRoles`, messageRun: `messageStackRoles`},
          ]
        },
        {
          name: "clear",
          type: "group",
          entries: [
            {name: `user`, chatInputRun: `chatInputClearUser`, messageRun: `messageClearUser`, default: true},
            {name: `all`, chatInputRun: `chatInputClearAll`, messageRun: `messageClearAll`}
          ],
        },
        {
          name: "leaderboard",
          chatInputRun: "chatInputLeaderboard",
          messageRun: "messageLeaderboard"
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
          .addSubcommand(command => command
            .setName(`set_background`)
            .setDescription(`Sets the background for the rank card`)
            .addAttachmentOption(option =>
              option
                .setName("image")
                .setDescription("The image to use. Should be 930x280px, and only png files allowed.")
            )
            .addIntegerOption(option =>
              option
                .setName("transparency")
                .setDescription("The transparency of the inner border. Default 90.")
                .setMinValue(0)
                .setMaxValue(100)
            )
          )
          .addSubcommand(command => command
            .setName(`set_embeds`)
            .setDescription(`If enabled, send an embed instead of a rank card.`)
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
                .setMinValue(1)
                .setMaxValue(1000)
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
            .addSubcommand(command => command
              .setName(`set_stacking`)
              .setDescription(`Toggles stacking of level roles.`)
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
          .addSubcommand(command => command
            .setName(`leaderboard`)
            .setDescription(`Shows the server's leaderboard`)
          )
        .setDMPermission(false),
    );
  }

  async getLeaderboard(guild) {
    const db = await settings.findById(guild.id).cacheQuery();
    
    const lb = db.leveling.users.sort(((a, b) => {
      if (a.level == b.level) {
        return (b.xp - a.xp);
      } else if (a.level > b.level) return 1; else if (a.level < b.level) return -1; else return 0;
    })).reverse();

    return lb;
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
    if (db.leveling.useEmbed) {
      const leaderboard = await this.getLeaderboard(interaction.guild)
      const rank = leaderboard.findIndex(r => r.id === member.user.id);
      const embed = new EmbedBuilder()
      .setAuthor({
        name: member.displayName,
        iconURL: member.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .setColor(Colors.Orange)
      .setTimestamp(new Date())
      .setDescription(`**Level ${level.level}**${rank > -1 ? `\n-# Rank ${rank+1}`: ``}\n${emojibarv2('<:caw_bar_xo:1321053069777174560>', '<:caw_bar_xo:1321053069777174560>', '<:caw_bar_xi:1321053716186529803>', '<:caw_bar_oo:1321055114718609408>', '<:caw_bar_io:1321053105810444369>', '<:caw_bar_io:1321053105810444369>', '<:caw_bar_ii:1321053135221035038>', '<:caw_bar_ox:1321053007361605642>', '<:caw_bar_ix:1321054189836701758>', '<:caw_bar_ix:1321054189836701758>', level.xp, calculateLevel(level.level), 10)}\n${level.xp} / ${ calculateLevel(level.level)}xp`)
      return await interaction.followUp({embeds: [embed]});
    }
    let image = null;
    try {
      image = await fs.readFileSync(__dirname+`/../../static/rankcards/${interaction.guild.id}-rankcard.png`);
    }
    catch (err) {
      console.log(`No rank card found. Continuing.`);
    }

    const leaderboard = await this.getLeaderboard(interaction.guild)
    const rank = leaderboard.findIndex(r => r.id === member.user.id);
    
    Font.loadDefault();
    const rankCard = new RankCardBuilder()
    .setUsername(member.user.username)
    .setDisplayName(member.displayName)
    .setAvatar(member.displayAvatarURL({ extension: "png", forceStatic: true, size: 512 }))
    .setCurrentXP(level.xp)
    .setRequiredXP(calculateLevel(level.level))
    .setBackground(image)
    .setOverlay(db.leveling.backgroundTransparency)
    .setRank(rank > -1 ? rank+1 : null)
    .setStatus(member.presence?.status)
    .setLevel(level.level);

    await interaction.followUp({ files: [(await rankCard.build({ format: 'png' }))] });
  }
  /**
   * @param {Message} message 
   * @param {Args} args 
   * @returns 
   */
  async messageRank(message, args) {
    let member = await args.pick('member').catch(() => message.member);
    const db = await settings.findById(message.guild.id).cacheQuery();
    const level = db.leveling.users.find(u => u.id == member.user.id);
    if (!level) return message.reply(`${this.container.emojis.info} No level exists for this user yet. Keep chatting to gain levels.`)
    if (db.leveling.useEmbed) {
      const leaderboard = await this.getLeaderboard(message.guild)
      const rank = leaderboard.findIndex(r => r.id === member.user.id);
      const embed = new EmbedBuilder()
      .setAuthor({
        name: member.displayName,
        iconURL: member.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .setColor(Colors.Orange)
      .setTimestamp(new Date())
      .setDescription(`**Level ${level.level}**${rank > -1 ? `\n-# Rank ${rank+1}`: ``}\n${emojibarv2('<:caw_bar_xo:1321053069777174560>', '<:caw_bar_xo:1321053069777174560>', '<:caw_bar_xi:1321053716186529803>', '<:caw_bar_oo:1321055114718609408>', '<:caw_bar_io:1321053105810444369>', '<:caw_bar_io:1321053105810444369>', '<:caw_bar_ii:1321053135221035038>', '<:caw_bar_ox:1321053007361605642>', '<:caw_bar_ix:1321054189836701758>', '<:caw_bar_ix:1321054189836701758>', level.xp, calculateLevel(level.level), 10)}\n${level.xp} / ${ calculateLevel(level.level)}xp`)
      return await message.reply({embeds: [embed]});
    }
    let image = null;
    try {
      image = await fs.readFileSync(__dirname+`/../../static/rankcards/${message.guild.id}-rankcard.png`);
    }
    catch (err) {
      console.log(`No rank card found. Continuing.`);
    }

    const leaderboard = await this.getLeaderboard(message.guild)
    const rank = leaderboard.findIndex(r => r.id === member.user.id);
    
    Font.loadDefault();
    const rankCard = new RankCardBuilder()
    .setUsername(member.user.username)
    .setDisplayName(member.displayName)
    .setAvatar(member.displayAvatarURL({ extension: "png", forceStatic: true, size: 512 }))
    .setCurrentXP(level.xp)
    .setRequiredXP(calculateLevel(level.level))
    .setBackground(image)
    .setOverlay(db.leveling.backgroundTransparency)
    .setRank(rank > -1 ? rank+1 : null)
    .setStatus(member.presence?.status)
    .setLevel(level.level);

    await message.reply({ files: [(await rankCard.build({ format: 'png' }))] });

  }

  async chatInputSetLegacy(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`, ephemeral: true});
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    db.leveling.useEmbed = !db.leveling.useEmbed;
    await db.save();
    interaction.followUp(`${this.container.emojis.success} ${db.leveling.useEmbed ? `Now using embeds instead of rank cards.` : `Now using rank cards again.`}`);
  }
  async messageSetLegacy(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const db = await settings.findById(message.guild.id).cacheQuery();
    db.leveling.useEmbed = !db.leveling.useEmbed;
    await db.save();
    message.reply(`${this.container.emojis.success} ${db.leveling.useEmbed ? `Now using embeds instead of rank cards.` : `Now using rank cards again.`}`);
  }

  async chatInputLeaderboard(interaction) {
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    const leaderboard = await this.getLeaderboard(interaction.guild);
    if (!leaderboard) return interaction.reply(`${this.container.client.error} Oh no, there is no leaderboard yet! Don't worry, there'll be one once someone starts talking.`)
    const rank = leaderboard.findIndex(r => r.id === interaction.user.id);

    const paginated = new PaginatedMessage();

    for (let i = 0; i < leaderboard.length; i += 10) {
      console.log(i)
      await paginated.addPageBuilder(page => page
        .setEmbeds([new EmbedBuilder()
          .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true })
          })
          .setDescription(`${i == 0 ? `You are ranked \`${rank+1}\` on the leaderboard.\n\n` : ''}${leaderboard.slice(i, i+10).map((r) => `\` ${leaderboard.findIndex(m => m.id === r.id)+1} \` <@${r.id}> : lvl ${r.level}\n> ${r.xp} / ${calculateLevel(r.level)} xp`).join(`\n`)}`)
          .setColor(Colors.Orange)
          .setTimestamp(new Date())
        ])
      )
    }

    await paginated.run(interaction, interaction.user);
  }
  async messageLeaderboard(message) {
    const db = await settings.findById(message.guild.id).cacheQuery();
    const leaderboard = await this.getLeaderboard(message.guild);
    if (!leaderboard) return message.reply(`${this.container.client.error} Oh no, there is no leaderboard yet! Don't worry, there'll be one once someone starts talking.`)
    const rank = leaderboard.findIndex(r => r.id === message.author.id);

    const paginated = new PaginatedMessage();

    for (let i = 0; i < leaderboard.length; i += 10) {
      console.log(i)
      await paginated.addPageBuilder(page => page
        .setEmbeds([new EmbedBuilder()
          .setAuthor({
            name: message.guild.name,
            iconURL: message.guild.iconURL({ dynamic: true })
          })
          .setDescription(`${i == 0 ? `You are ranked \`${rank+1}\` on the leaderboard.\n\n` : ''}${leaderboard.slice(i, i+10).map((r) => `\` ${leaderboard.findIndex(m => m.id === r.id)+1} \` <@${r.id}> : lvl ${r.level}\n> ${r.xp} / ${calculateLevel(r.level)} xp`).join(`\n`)}`)
          .setColor(Colors.Orange)
          .setTimestamp(new Date())
        ])
      )
    }

    await paginated.run(message, message.author);
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputSetBackground(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`, ephemeral: true});
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    let image = interaction.options.getAttachment('image');
    let transparency = interaction.options.getInteger('transparency');
    db.leveling.backgroundTransparency = transparency ?? 90;
    await db.save();

    if (!image) {
      await fs.rm(__dirname+`/../../static/rankcards/${interaction.guild.id}-rankcard.png`, { recursive: false }, (err) => {
        if (err) return interaction.followUp(`${this.container.emojis.error} There is no rank card set.`);
        return interaction.followUp(`${this.container.emojis.success} The rank card has been deleted.`);
      });
      return;
    }
    if (image.contentType != `image/png`) return interaction.followUp(`${this.container.emojis.error} Invalid image format. Only png files are supported.`);
    try {
      const imgBuffer = Buffer.from(await ((await fetch(image.url)).arrayBuffer()))
      await fs.writeFileSync(__dirname+`/../../static/rankcards/${interaction.guild.id}-rankcard.png`, imgBuffer);
      return interaction.followUp(`${this.container.emojis.success} Successfully set the rank card background.`);
    }
    catch (err) {
      return interaction.followUp(`${this.container.emojis.error} ${err}`);
    }
    
  }
  async messageSetBackground(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const db = await settings.findById(message.guild.id).cacheQuery();
    let transparency = await args.pick('integer').catch(() => 90);
    if (transparency > 100 || transparency < 0) return message.reply(`${this.container.emojis.error} Invalid transparency value.`)
    let image = message.attachments?.first();
    db.leveling.backgroundTransparency = transparency ?? 90;
    await db.save();

    if (!image) {
      await fs.rm(__dirname+`/../../static/rankcards/${message.guild.id}-rankcard.png`, { recursive: false }, (err) => {
        if (err) return message.reply(`${this.container.emojis.error} There is no rank card set.`);
        return message.reply(`${this.container.emojis.success} The rank card has been deleted.`);
      });
      return;
    }
    if (image.contentType != `image/png`) return message.reply(`${this.container.emojis.error} Invalid image format. Only png files are supported.`);
    try {
      const imgBuffer = Buffer.from(await ((await fetch(image.url)).arrayBuffer()));
      await fs.writeFileSync(__dirname+`/../../static/rankcards/${message.guild.id}-rankcard.png`, imgBuffer);
      return message.reply(`${this.container.emojis.success} Successfully set the rank card background.`);
    }
    catch (err) {
      return message.reply(`${this.container.emojis.error} ${err}`);
    }
    
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

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async chatInputListReward(interaction) {
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    const embed = new EmbedBuilder()
    .setAuthor({
      name: interaction.guild.name,
      iconURL: interaction.guild.iconURL({ dynamic: true })
    })
    .setDescription(db.leveling.levelRoles.sort((a, b) => a.level - b.level).map(r => `${r.level} -> <@&${r.roleId}>`).join('\n') || 'There is no level roles to display.')
    .setFooter({
      text: `Level roles ${db.leveling.stackRoles ? 'stacks' : 'do not stack'}`
    })
    .setTimestamp(new Date())
    .setColor(Colors.Orange);

    interaction.followUp({embeds: [embed]});
  }
  async messageListReward(message) {
    const db = await settings.findById(message.guild.id).cacheQuery();
    const embed = new EmbedBuilder()
    .setAuthor({
      name: message.guild.name,
      iconURL: message.guild.iconURL({ dynamic: true })
    })
    .setDescription(db.leveling.levelRoles.sort((a, b) => a.level - b.level).map(r => `${r.level} -> <@&${r.roleId}>`).join('\n') || 'There is no level roles to display.')
    .setFooter({
      text: `Level roles ${db.leveling.stackRoles ? 'stacks' : 'do not stack'}`
    })
    .setTimestamp(new Date())
    .setColor(Colors.Orange);

    message.reply({embeds: [embed]});
  }

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async chatInputAddReward(interaction) {
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    if (((await premiumCheck(interaction.guild)) == false) && db.leveling.levelRoles > 10) return interaction.followUp(`${this.container.emojis.error} You've reached the maximum amount of level roles allowed. Buy plus to extend the limit.`);
    if (db.leveling.levelRoles > 50) return interaction.followUp(`${this.container.emojis.error} You've reached the maximum amount of level roles allowed.`);
    const role = interaction.options.getRole('role');
    const lvl = interaction.options.getInteger('level');
    const found = db.leveling.levelRoles.findIndex(r => (r.roleId == role.id && r.level == lvl));
    if (found > -1) {
      db.leveling.levelRoles[found].roleId = role.id;
      db.leveling.levelRoles[found].level = lvl.id;
    }
    else db.leveling.levelRoles.push({ roleId: role.id, level: lvl });
    await db.save();
    
    interaction.followUp({ content: `${this.container.emojis.success} Now assigning ${role} on level ${lvl}`, allowedMentions:{parse:[]} });
  }

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async chatInputRemoveReward(interaction) {
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    const role = interaction.options.getRole('role');
    const found = db.leveling.levelRoles.findIndex(r => (r.roleId == role.id));
    if (found > -1) {
      db.leveling.levelRoles.splice(found, 1);
      await db.save();
      interaction.followUp({ content: `${this.container.emojis.success} Removed ${role} from the level roles.`, allowedMentions:{parse:[]} });
    }
    else return interaction.followUp(`${this.container.emojis.error} That role doesn't exist as a level role.`)
    
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputStackRoles(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({content: `${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`, ephemeral: true});
    await interaction.deferReply();
    const db = await settings.findById(interaction.guild.id).cacheQuery();
    db.leveling.stackRoles = !db.leveling.stackRoles;
    await db.save();
    interaction.followUp(`${this.container.emojis.success} ${db.leveling.stackRoles ? `Level roles will now stack.` : `No longer stacking level roles.`}`);
  }
  async messageStackRoles(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply(`${this.container.emojis.error} Only members with \`Manage Server\` can toggle leveling.`);
    const db = await settings.findById(message.guild.id).cacheQuery();
    db.leveling.stackRoles = !db.leveling.stackRoles;
    await db.save();
    message.reply(`${this.container.emojis.success} ${db.leveling.stackRoles ? `Level roles will now stack.` : `No longer stacking level roles.`}`);
  }
}
module.exports = {
  PingCommand,
};
