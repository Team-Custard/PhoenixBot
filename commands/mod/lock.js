const { Subcommand } = require("@sapphire/plugin-subcommands");
const { ApplicationCommandRegistry, BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits, ChatInputCommandInteraction, PermissionsBitField } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const { setTimeout } = require("timers/promises");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "lock",
      aliases: [`l`, `lockdown`],
      description: "Locks a channel.",
      detailedDescription: {
        usage: "lock [flags]",
        examples: ["lock", "lock server"]
      },
      cooldownDelay: 30_000,
      cooldownScope: BucketScope.Guild,
      requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
      requiredClientPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
      subcommands: [{
        name: "channel",
        chatInputRun: "chatInputLockChannel",
        messageRun: "messageLockChannel",
        default: true
      }, {
        name: "all",
        chatInputRun: "chatInputLockServer",
        messageRun: "messageLockServer"
      }, {
        name: "server",
        chatInputRun: "chatInputLockServer",
        messageRun: "messageLockServer"
      }, {
        name: "end",
        chatInputRun: "chatInputEnd",
        messageRun: "messageEnd"
      }, 
      {
        name: "unlock",
        chatInputRun: "chatInputEnd",
        messageRun: "messageEnd"
      }, {
        name: "fixperms",
        chatInputRun: "chatInputFixperms",
        messageRun: "messageFixperms",
        requiredUserPermissions: [PermissionFlagsBits.ManageRoles]
      }],
      preconditions: ["module"]
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand(command => 
      command.setName("lockdown")
      .setDescription("Locks the channels")
      .addSubcommand(subcommand => 
        subcommand.setName("channel")
        .setDescription("Locks a channel")
        .addChannelOption(input =>
          input.setName("channel")
          .setDescription("The channel to lock")
        )
      )
      .addSubcommand(subcommand => 
        subcommand.setName("server")
        .setDescription("Locks the server")
      )
      .addSubcommand(subcommand => 
        subcommand.setName("unlock")
        .setDescription("Unlocks the server")
      )
      .addSubcommand(subcommand => 
        subcommand.setName("fixperms")
        .setDescription("Checks and fixes all your server roles if there are conflicts with server lockdowns.")
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(1024),
    )
  }

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async chatInputFixperms(interaction) {
    const reply = await interaction.reply(`${this.container.emojis.loading} **Please wait...**`);

    const roles = await interaction.guild.roles.fetch();
    let successes = 0;
    for (let i = 0; i < roles.size; i++) {
      if (/* roles.at(i).permissions.has("SendMessages") && */roles.at(i).id != interaction.guild.roles.everyone.id) {
        const permissions = new PermissionsBitField(roles.at(i).permissions);
        await permissions.remove("SendMessages");
        await permissions.remove("SendMessagesInThreads");
        await permissions.remove("Connect");
        await permissions.remove("Speak");
        const result = await roles.at(i).setPermissions(permissions, `Fixing role permissions for lockdown`).catch(() => undefined);
        if (result) successes++;
        await setTimeout(1000);
      }
    }
    await reply.edit(`${this.container.emojis.success} Successfully fixed the permissions for ${successes} roles.`)
  }

  async messageFixperms(message) {
    const reply = await message.reply(`${this.container.emojis.loading} **Please wait...**`);

    const roles = await message.guild.roles.fetch();
    let successes = 0;
    for (let i = 0; i < roles.size; i++) {
      if (/* roles.at(i).permissions.has("SendMessages") && */roles.at(i).id != message.guild.roles.everyone.id) {
        const permissions = new PermissionsBitField(roles.at(i).permissions);
        await permissions.remove("SendMessages");
        await permissions.remove("SendMessagesInThreads");
        await permissions.remove("Connect");
        await permissions.remove("Speak");
        const result = await roles.at(i).setPermissions(permissions, `Fixing role permissions for lockdown`).catch(() => undefined);
        if (result) successes++;
        await setTimeout(1000);
      }
    }
    await reply.edit(`${this.container.emojis.success} Successfully fixed the permissions for ${successes} roles.`)
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputLockServer(interaction) {
    await interaction.deferReply();
    if (!interaction.guild.roles.everyone.permissions.has(PermissionsBitField.resolve("SendMessages"))) return interaction.followUp(`${this.container.emojis.error} The server is already locked.`);
    const permissions = new PermissionsBitField(interaction.guild.roles.everyone.permissions);
    await permissions.remove("SendMessages");
    await permissions.remove("SendMessagesInThreads");
    await permissions.remove("Connect");
    await permissions.remove("Speak");
    await interaction.guild.roles.everyone.setPermissions(permissions, `(Lock by ${interaction.user.tag})`);
    return interaction.followUp(`${this.container.emojis.success} The server has been locked until \`lock end\` is used.`);
  }

  async messageLockServer(message) {
    if (!message.guild.roles.everyone.permissions.has(PermissionsBitField.resolve("SendMessages"))) return message.reply(`${this.container.emojis.error} The server is already locked.`);
    const permissions = new PermissionsBitField(message.guild.roles.everyone.permissions);
    await permissions.remove("SendMessages");
    await permissions.remove("SendMessagesInThreads");
    await permissions.remove("Connect");
    await permissions.remove("Speak");
    await message.guild.roles.everyone.setPermissions(permissions, `(Lock by ${message.author.tag})`);
    return message.reply(`${this.container.emojis.success} The server has been locked until \`lock end\` is used.`);
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputLockChannel(interaction) {
    await interaction.deferReply();
    let channel = interaction.options.getChannel("channel");
    if (!channel) channel = interaction.channel;
    if (!channel.permissionsFor(interaction.guild.roles.everyone).has(PermissionFlagsBits.SendMessages)) return interaction.followUp(`${this.container.emojis.error} This channel is already locked.`);

    await channel.permissionOverwrites
    .edit(
      interaction.guild.roles.everyone,
      {
        SendMessages: false,
        SendMessagesInThreads: false,
        Connect: false,
        Speak: false,
      },
      `(Lock by ${interaction.user.tag})`,
    )
    .then(() => interaction.followUp(`${this.container.emojis.success} **${channel.name}** has been locked until \`lock end\` is used.`))
    .catch((err) => interaction.followUp(`${this.container.emojis.error} ${err}`));
  }

  async messageLockChannel(message, args) {
    let channel = await args.pick("channel").catch(() => undefined);
    if (!channel) channel = message.channel;
    if (!channel.permissionsFor(message.guild.roles.everyone).has(PermissionFlagsBits.SendMessages)) return message.reply(`${this.container.emojis.error} This channel is already locked.`);

    await channel.permissionOverwrites
    .edit(
      message.guild.roles.everyone,
      {
        SendMessages: false,
        SendMessagesInThreads: false,
        Connect: false,
        Speak: false,
      },
      `(Lock by ${message.author.tag})`,
    )
    .then(() => message.reply(`${this.container.emojis.success} **${channel.name}** has been locked until \`lock end\` is used.`))
    .catch((err) => message.reply(`${this.container.emojis.error} ${err}`));
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputEnd(interaction) {
    await interaction.deferReply();
    if (!interaction.guild.roles.everyone.permissions.has(PermissionsBitField.resolve(PermissionFlagsBits.SendMessages))) {
      const permissions = new PermissionsBitField(interaction.guild.roles.everyone.permissions);
      await permissions.add("SendMessages");
      await permissions.add("SendMessagesInThreads");
      await permissions.add("Connect");
      await permissions.add("Speak");
      await interaction.guild.roles.everyone.setPermissions(permissions, `(Unlock by ${interaction.user.tag})`);
      return interaction.followUp(`${this.container.emojis.success} The server lockdown has ended.`);
    }
    
    if (interaction.channel.permissionsFor(interaction.guild.roles.everyone).has(PermissionFlagsBits.SendMessages)) return interaction.followUp(`${this.container.emojis.error} There is no active lockdown.`);

    await interaction.channel.permissionOverwrites
    .edit(
      interaction.guild.roles.everyone,
      {
        SendMessages: null,
        SendMessagesInThreads: null,
        Connect: null,
        Speak: null,
      },
      `(Unlock by ${interaction.user.tag})`,
    )
    .then(() => interaction.followUp(`${this.container.emojis.success} **${interaction.channel.name}** lockdown has ended.`))
    .catch((err) => interaction.followUp(`${this.container.emojis.error} ${err}`));
  }

  async messageEnd(message) {
    if (!message.guild.roles.everyone.permissions.has(PermissionsBitField.resolve(PermissionFlagsBits.SendMessages))) {
      const permissions = new PermissionsBitField(message.guild.roles.everyone.permissions);
      await permissions.add("SendMessages");
      await permissions.add("SendMessagesInThreads");
      await permissions.add("Connect");
      await permissions.add("Speak");
      await message.guild.roles.everyone.setPermissions(permissions, `(Unlock by ${message.author.tag})`);
      return message.reply(`${this.container.emojis.success} The server lockdown has ended.`);
    }
    
    if (message.channel.permissionsFor(message.guild.roles.everyone).has(PermissionFlagsBits.SendMessages)) return message.reply(`${this.container.emojis.error} There is no active lockdown.`);

    await message.channel.permissionOverwrites
    .edit(
      message.guild.roles.everyone,
      {
        SendMessages: null,
        SendMessagesInThreads: null,
        Connect: null,
        Speak: null,
      },
      `(Unlock by ${message.author.tag})`,
    )
    .then(() => message.reply(`${this.container.emojis.success} **${message.channel.name}** lockdown has ended.`))
    .catch((err) => message.reply(`${this.container.emojis.error} ${err}`));
  }

  // Legacy lockdown channels code
  /* async messageRun(message, args) {
    const all = args.getFlags("all", "a");
    const end = args.getFlags("end", "e");
    const endAll = args.getFlags("endall", "ea");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (all) {
      const accepted = await require(`../../tools/warningEmbed`).warnMessage(
        message,
        `You're about to initiate a mass lockdown. This may take a while depending on how many channels are assigned to be locked. Continue?`,
      );
      if (!accepted) return;
      const msg = await message.reply(
        `${this.container.emojis.loading} **Lockdown started...**`,
      );
      let index = 0;
      let trueindex = 0;
      let success = 0;
      const channels = [];
      const fetchedChannels = await message.guild.channels.fetch();
      for (let i = 0; i < fetchedChannels.size; i++) {
        if (db.moderation.lockdownChannels.includes(fetchedChannels.at(i).id)) {
          channels.push(fetchedChannels.at(i));
        }
      }
      const total = channels.length;
      console.log(`Modifying ${total} channels`);
      if (total == 0)
        return message.reply(
          `${this.container.emojis.error} No channels were set to lock. Use \`lockchannels\` to set them.`,
        );
      channels.forEach(function (channel) {
        index++;
        setTimeout(async function () {
          trueindex++;
          console.log(`Modifying channel ${trueindex}/${total}`);
          await channel.permissionOverwrites
            .edit(
              message.guild.roles.everyone,
              {
                SendMessages: false,
                AddReactions: false,
                Connect: false,
                Speak: false,
              },
              `(Lockdown by ${message.author.tag})`,
            )
            .then(function () {
              console.log(`Success`);
              success++;
            })
            .catch((err) => {
              console.log(`Failed (${err})`);
            });
          if (trueindex == total) {
            msg.edit(
              `${this.container.emojis.success} Successfully locked ${success}/${total} channels.`,
            );
          }
        }, 1000 * index);
      });
    } else if (endAll) {
      const msg = await message.reply(
        `${this.container.emojis.loading} **Unlock started...**`,
      );
      let index = 0;
      let trueindex = 0;
      let success = 0;
      const channels = [];
      const fetchedChannels = await message.guild.channels.fetch();
      for (let i = 0; i < fetchedChannels.size; i++) {
        if (db.moderation.lockdownChannels.includes(fetchedChannels.at(i).id)) {
          channels.push(fetchedChannels.at(i));
        }
      }
      const total = channels.length;
      console.log(`Modifying ${total} channels`);
      if (total == 0)
        return message.reply(
          `${this.container.emojis.error} No channels were set to lock. Use \`lockchannels\` to set them.`,
        );
      channels.forEach(function (channel) {
        index++;
        setTimeout(async function () {
          trueindex++;
          console.log(`Modifying channel ${trueindex}/${total}`);
          await channel.permissionOverwrites
            .edit(
              message.guild.roles.everyone,
              {
                SendMessages: null,
                AddReactions: null,
                Connect: null,
                Speak: null,
              },
              `(Unlock by ${message.author.tag})`,
            )
            .then(function () {
              console.log(`Success`);
              success++;
            })
            .catch((err) => {
              console.log(`Failed (${err})`);
            });
          if (trueindex == total) {
            msg.edit(
              `${this.container.emojis.success} Successfully unlocked ${success}/${total} channels.`,
            );
          }
        }, 1000 * index);
      });
    } else if (end) {
      await message.channel.permissionOverwrites
        .edit(
          message.guild.roles.everyone,
          {
            SendMessages: null,
            AddReactions: null,
            Connect: null,
            Speak: null,
          },
          `(Unlock by ${message.author.tag})`,
        )
        .then(function () {
          message.reply(
            `${this.container.emojis.success} Successfully unlocked ${message.channel}.`,
          );
        })
        .catch((err) => {
          message.reply(`${this.container.emojis.error} ${err}`);
        });
    } else {
      await message.channel.permissionOverwrites
        .edit(
          message.guild.roles.everyone,
          {
            SendMessages: false,
            AddReactions: false,
            Connect: false,
            Speak: false,
          },
          `(Locked by ${message.author.tag})`,
        )
        .then(function () {
          message.reply(
            `${this.container.emojis.success} Successfully locked ${message.channel}.`,
          );
        })
        .catch((err) => {
          message.reply(`${this.container.emojis.error} ${err}`);
        });
    }
  } */
}
module.exports = {
  PingCommand,
};
