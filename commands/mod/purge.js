const { Subcommand } = require("@sapphire/plugin-subcommands");
const { ApplicationCommandRegistry, BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits, ChatInputCommandInteraction, PermissionsBitField } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const { setTimeout } = require("timers/promises");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "clean",
      aliases: [`purge`, `p`, `clear`],
      description: "Bulk deletes messages in the channel.",
      detailedDescription: {
        usage: "purge [type] [limit]",
        args: ["type: The type of purge to do"]
      },
      cooldownDelay: 30_000,
      cooldownScope: BucketScope.Guild,
      requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
      requiredClientPermissions: [PermissionFlagsBits.ManageMessages],
      subcommands: [{
        name: "all",
        chatInputRun: "chatInputPurgeAll",
        messageRun: "messagePurgeAll",
        default: true,
      }, {
        name: "user",
        chatInputRun: "chatInputPurgeUser",
        messageRun: "messagePurgeUser",
      }, {
        name: "bots",
        chatInputRun: "chatInputPurgeBots",
        messageRun: "messagePurgeBots",
      }],
      preconditions: ["module"]
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand(command => 
      command.setName("purge")
      .setDescription("Purges messages in a channel")
      .addSubcommand(subcommand => 
        subcommand.setName("all")
        .setDescription("Purges any message in the channel")
        .addIntegerOption(input =>
          input.setName("limit")
          .setDescription("The amount of messages to purge")
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true)
        )
      )
      .addSubcommand(subcommand => 
        subcommand.setName("user")
        .setDescription("Purges all messages in the channel from a specific user")
        .addUserOption(input =>
            input.setName("user")
            .setDescription("The user's messages to purge")
            .setRequired(true)
        )
        .addIntegerOption(input =>
          input.setName("limit")
          .setDescription("The amount of messages to purge")
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true)
        )
      )
      .addSubcommand(subcommand => 
        subcommand.setName("bots")
        .setDescription("Purges all messages sent by bots in the channel")
        .addIntegerOption(input =>
          input.setName("limit")
          .setDescription("The amount of messages to purge")
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true)
        )
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    )
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputPurgeAll(interaction) {
    const reply = await interaction.deferReply({ fetchReply: true });
    const limit = interaction.options.getInteger("limit");
    const messages = await interaction.channel.messages.fetch({
        bulkDeletable: true,
        before: reply.id,
        limit: limit
    });
    const purged = await interaction.channel.bulkDelete(messages, true);
    await interaction.followUp(`${this.container.emojis.success} Deleted ${purged.size}** messages.`)
  }

  async messagePurgeAll(message, args) {
    const limit = await args.pick("integer");
    const messages = await message.channel.messages.fetch({
        bulkDeletable: true,
        before: message.id,
        limit: limit
    });
    const purged = await message.channel.bulkDelete(messages, true);
    await message.reply(`${this.container.emojis.success} Deleted ${purged.size}** messages.`)
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputPurgeUser(interaction) {
    const reply = await interaction.deferReply({ fetchReply: true });
    const member = interaction.options.getUser("user");
    const limit = interaction.options.getInteger("limit");
    const messages = await interaction.channel.messages.fetch({
        bulkDeletable: true,
        before: reply.id,
        limit: limit
    }).then(messages => {return messages.filter((msg => msg.author.id == member.id))})
    const purged = await interaction.channel.bulkDelete(messages, true);
    await interaction.followUp(`${this.container.emojis.success} Deleted **${purged.size}** messages.`)
  }

  async messagePurgeUser(message, args) {
    const limit = await args.pick("integer");
    if (limit < 0 || limit > 100) return message.reply(`${this.container.emojis.error} You can only clean between 1-100 messages at a time.`)
    const member = await args.pick("user");
    const messages = await message.channel.messages.fetch({
        bulkDeletable: true,
        before: message.id,
        limit: limit
    }).then(async messages => {
        const filter = messages.filter((msg => msg.author.id == member.id))
        const purged = await message.channel.bulkDelete(filter, true);
        await message.reply(`${this.container.emojis.success} Deleted **${purged.size}** messages.`)
    })
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputPurgeBots(interaction) {
    const reply = await interaction.deferReply({ fetchReply: true });
    const member = interaction.options.getUser("user");
    const limit = interaction.options.getInteger("limit");
    const messages = await interaction.channel.messages.fetch({
        bulkDeletable: true,
        before: reply.id,
        limit: limit
    }).then(messages => {return messages.filter((msg => msg.author.bot))})
    const purged = await interaction.channel.bulkDelete(messages, true);
    await interaction.followUp(`${this.container.emojis.success} Deleted **${purged.size}** messages.`)
  }

  async messagePurgeBots(message, args) {
    const limit = await args.pick("integer");
    if (limit < 0 || limit > 100) return message.reply(`${this.container.emojis.error} You can only clean between 1-100 messages at a time.`)
    const member = await args.pick("user");
    const messages = await message.channel.messages.fetch({
        bulkDeletable: true,
        before: message.id,
        limit: limit
    }).then(async messages => {
        const filter = messages.filter((msg => msg.author.bot))
        const purged = await message.channel.bulkDelete(filter, true);
        await message.reply(`${this.container.emojis.success} Deleted **${purged.size}** messages.`)
    })
  }


  
}
module.exports = {
  PingCommand,
};
