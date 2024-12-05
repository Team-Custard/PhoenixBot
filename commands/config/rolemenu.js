const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope, ApplicationCommandRegistry } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'rolemenu',
      aliases: ['rolesmenu', 'pickroles'],
      description: 'Manages roles menus in the server for users to select their roles.',
      detailedDescription: {
        usage: 'rolemenu [option] [args]',
        examples: ['rolemenu create ping "Ping roles" multi', 'rolemenu message ping'],
        args: ['[option] : The option to use. Must be create, add, message, delete, remove.', '[args] : The arguments for the option.']
      },
      subcommands: [
        {
          name: "create",
          chatInputRun: "chatInputCreate",
          messageRun: "messageCreate",
        },
        {
          name: "add",
          chatInputRun: "chatInputAdd",
          messageRun: "messageAdd",
        },
        {
          name: "remove",
          chatInputRun: "chatInputRemove",
          messageRun: "messageRemove",
        },
        {
          name: "attach",
          chatInputRun: "chatInputSendMsg",
          messageRun: "messageSendMsg",
        },
        {
          name: "clean",
          chatInputRun: "chatInputClean",
          messageRun: "messageClean",
        },
        {
          name: "delete",
          chatInputRun: "chatInputDelete",
          messageRun: "messageDelete",
        },
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
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
        .setName("rolemenu")
        .setDescription("Manages role menu settings")
        .addSubcommand((command) =>
          command.setName("create")
          .setDescription("Creates a role menu")
          .addStringOption((option) =>
            option
              .setName("name")
              .setDescription("The name of the rolemenu to use")
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName("type")
              .setDescription("The type of role menu this is")
              .setRequired(true)
              .setChoices([
                { name: `single`, value: `one` },
                { name: `multiple`, value: `multi` }
              ])
          ),
        )
        .addSubcommand((command) =>
          command.setName("add")
          .setDescription("Adds/updates a role to a role menu")
          .addStringOption((option) =>
            option
              .setName("name")
              .setDescription("The name of the rolemenu to use")
              .setRequired(true)
              .setAutocomplete(true),
          )
          .addRoleOption((option) => 
            option
              .setName("role")
              .setDescription("The role to add to the rolemenu")
              .setRequired(true),
          )
          .addStringOption((option) => 
            option
              .setName("emoji")
              .setDescription("The emoji to set as the menu option icon")
              .setRequired(true)
          ),
        )
        .addSubcommand((command) => 
          command
            .setName("remove")
            .setDescription("Removes a role from the role menu")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the rolemenu to use")
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addRoleOption((option) => 
              option
                .setName("role")
                .setDescription("The role to remove from the rolemenu")
                .setRequired(true),
            )
        )
        .addSubcommand((command) => 
          command
            .setName("attach")
            .setDescription("Attaches a rolemenu to a message")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the rolemenu to use")
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addStringOption((option) => 
              option
                .setName("message")
                .setDescription("The id of the message to link to")
                .setRequired(true),
            )
        )
        .addSubcommand((command) => 
          command
            .setName("clean")
            .setDescription("Removes all attachments from a message")
            .addStringOption((option) => 
              option
                .setName("message")
                .setDescription("The id of the message to link to")
                .setRequired(true),
            )
        )
        .addSubcommand((command) => 
          command
            .setName("delete")
            .setDescription("Deletes a role menu")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the rolemenu to delete")
                .setRequired(true)
                .setAutocomplete(true),
            )
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(32),
    );
  }

  async chatInputCreate(interaction) {
    await interaction.deferReply();

    const mid = await interaction.options.getString("name").toLowerCase();
    const type = await interaction.options.getString("type");

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (db.rolesMenu.find(r => r.id == mid)) {
      return interaction.followUp(`${this.container.emojis.error} Role menu already exists.`);
    }

    if (db.rolesMenu.length == 3 && await !require('../../tools/premiumCheck')(interaction.guild.id)) return interaction.followUp(`${this.container.emojis.error} You've created the maximum amount of free role menus for this server (3). If you need more, upgrade to Plus or delete one.`);
    if (db.rolesMenu.length == 20) return interaction.followUp(`${this.container.emojis.error} You've created the maximum amount of role menus for this server (20).`);

    db.rolesMenu.push({
      id: mid,
      name: mid,
      menutype: type,
    });

    await db.save();

    interaction.followUp(
      `${this.container.emojis.success} Created role menu with id \`${mid}\`.`,
    );
  }

  async messageCreate(message, args) {
    const mid = await args.pick("string").toLowerCase();
    const type = await args.pick("string").catch(() => "one");
    if (type != "one" && type != "multi") return message.reply(`${this.container.emojis.error} Type must be either one or multi.`);

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (db.rolesMenu.find(r => r.id == mid)) {
      return message.followUp(`${this.container.emojis.error} Role menu already exists.`);
    }

    if (db.rolesMenu.length == 3 && await !require('../../tools/premiumCheck')(message.guild.id)) return message.reply(`${this.container.emojis.error} You've created the maximum amount of free role menus for this server (3). If you need more, upgrade to Plus or delete one.`);
    if (db.rolesMenu.length == 20) return message.reply(`${this.container.emojis.error} You've created the maximum amount of role menus for this server (20).`);

    db.rolesMenu.push({
      id: mid,
      name: mid,
      menutype: type,
    });

    await db.save();

    message.reply(
      `${this.container.emojis.success} Created role menu with id \`${mid}\`.`,
    );
  }

  async chatInputAdd(interaction) {
    await interaction.deferReply();
    const mid = await interaction.options.getString("name").toLowerCase();
    const role = await interaction.options.getRole("role");
    let baseemoji = await interaction.options.getString("emoji");
    if (!baseemoji) baseemoji = "⭐";

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const unicodeemoji = baseemoji.match(
      /\p{Extended_Pictographic}/gu
    );
    const customemoji = baseemoji.match(
      /<:.+?:\d+>/gu,
    );
    const emojis = new Array().concat(unicodeemoji, customemoji).filter(item => item);
    console.log(`${emojis} ;; ${baseemoji}`);
    if (emojis.length == 0) return interaction.followUp(`${this.container.emojis.error} Invalid emoji specified.`);

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) {
      return interaction.followUp(`${this.container.emojis.error} Role menu not found.`);
    }
    const existing = menu.roles.find(r => r.role == role.id);

    if (existing) {
      existing.role = role.id;
      existing.emoji = emojis[0];

      await db.save();
      return interaction.followUp(`${this.container.emojis.success} Updated role menu item successfully.`);
    }
    else {
      if (menu.roles.length == 16) return interaction.followUp(`${this.container.emojis.error} You can only create 16 roles per role menu. To add this role, remove a role or create a new role menu.`);
      menu.roles.push({ role: role.id, emoji: emojis[0] });
      await db.save();
      return interaction.followUp(`${this.container.emojis.success} Added role menu item successfully.`);
    }
  }

  async messageAdd(message, args) {
    const mid = await args.pick("string").toLowerCase();
    const role = await args.pick("role");
    const emojis = [await args.pick("emoji")];

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (emojis.length == 0) return message.reply(`${this.container.emojis.error} Invalid emoji specified.`);

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) {
      return message.reply(`${this.container.emojis.error} Role menu not found.`);
    }
    const existing = menu.roles.find(r => r.role == role.id);

    if (existing) {
      existing.role = role.id;
      existing.emoji = emojis[0];

      await db.save();
      return message.reply(`${this.container.emojis.success} Updated role menu item successfully.`);
    }
    else {
      if (menu.roles.length == 16) return message.reply(`${this.container.emojis.error} You can only create 16 roles per role menu. To add this role, remove a role or create a new role menu.`);
      menu.roles.push({ role: role.id, emoji: emojis[0] });
      await db.save();
      return message.reply(`${this.container.emojis.success} Added role menu item successfully.`);
    }
  }

  async chatInputRemove(interaction) {
    await interaction.deferReply();
    const mid = await interaction.options.getString("name").toLowerCase();
    const role = await interaction.options.getRole("role");

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) {
      return interaction.followUp(`${this.container.emojis.error} Role menu not found.`);
    }
    const existing = menu.roles.find(r => r.role == role.id);
    if (!existing) {
      return interaction.followUp(`${this.container.emojis.error} Role not found in role menu.`);
    }

    menu.roles.pull(existing);
    await db.save();
    return interaction.followUp(`${this.container.emojis.success} Removed role menu item successfully.`);
  }

  async messageRemove(message, args) {
    const mid = await args.pick("string").toLowerCase();
    const role = await args.pick("role");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) {
      return message.reply(`${this.container.emojis.error} Role menu not found.`);
    }
    const existing = menu.roles.find(r => r.role == role.id);
    if (!existing) {
      return message.reply(`${this.container.emojis.error} Role not found in role menu.`);
    }

    menu.roles.pull(existing);
    await db.save();
    return message.reply(`${this.container.emojis.success} Removed role menu item successfully.`);
  }

  async chatInputSendMsg(interaction) {
    await interaction.deferReply();
    const mid = await interaction.options.getString("name").toLowerCase();
    const msgid = await interaction.options.getString("message");

    const msg = await interaction.channel.messages.fetch(msgid)
    .catch(undefined);

    if (!msg) return interaction.followUp(`${this.container.emojis.error} Message not found.`);

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) return interaction.followUp(`${this.container.emojis.error} Role menu not found.`);
    const attachable = new StringSelectMenuBuilder()
    .setCustomId(`rm-${mid}`)
    .setPlaceholder(`Select a role to add or remove...`)
    .setMinValues(0)
    .setMaxValues(menu.menutype == 'multi' ? menu.roles.length : 1);

    for (let i = 0; i < menu.roles.length; i++) {
      const role = await interaction.guild.roles.fetch(menu.roles[i].role);
      // const emoji = await this.container.client.emojis.resolveId(roledb.roles[i].emoji);
      attachable.addOptions(
        new StringSelectMenuOptionBuilder()
        .setEmoji(menu.roles[i].emoji)
        .setLabel(role.name)
        .setValue(role.id)
      );
    }

    const component = new ActionRowBuilder()
    .addComponents(attachable);

    if (msg.components.size > 0 || msg.author.id != this.container.client.user.id) return interaction.followUp(`${this.container.emojis.error} This message cannot be used for .`);
    msg.edit({ components: [component] });
    return interaction.followUp(`${this.container.emojis.success} Role menu attached successfully.`);
  }

  async messageSendMsg(message, args) {
    const mid = await args.pick("string").toLowerCase();
    const msgid = await args.pick("string");

    const msg = await message.channel.messages.fetch(msgid)
    .catch(undefined);

    if (!msg) return message.reply(`${this.container.emojis.error} Message not found.`);

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) return message.reply(`${this.container.emojis.error} Role menu not found.`);
    const attachable = new StringSelectMenuBuilder()
    .setCustomId(`rm-${mid}`)
    .setPlaceholder(`Select a role to add or remove...`)
    .setMinValues(0)
    .setMaxValues(menu.menutype == 'multi' ? menu.roles.length : 1);

    for (let i = 0; i < menu.roles.length; i++) {
      const role = await message.guild.roles.fetch(menu.roles[i].role);
      // const emoji = await this.container.client.emojis.resolveId(roledb.roles[i].emoji);
      attachable.addOptions(
        new StringSelectMenuOptionBuilder()
        .setEmoji(menu.roles[i].emoji)
        .setLabel(role.name)
        .setValue(role.id)
      );
    }

    const component = new ActionRowBuilder()
    .addComponents(attachable);

    if (msg.components.size > 0 || msg.author.id != this.container.client.user.id) return message.reply(`${this.container.emojis.error} This message cannot be used for .`);
    msg.edit({ components: [component] });
    return message.reply(`${this.container.emojis.success} Role menu attached successfully.`);
  }

  async chatInputClean(interaction) {
    await interaction.deferReply();
    const msgid = await interaction.options.getString("message");

    const msg = await interaction.channel.messages.fetch(msgid)
    .catch(undefined);

    if (!msg) return interaction.followUp(`${this.container.emojis.error} Message not found.`);

    if (msg.components.size == 0 || msg.author.id != this.container.client.user.id) return interaction.followUp(`${this.container.emojis.error} This message cannot be used for .`);
    msg.edit({ components: [] });
    return interaction.followUp(`${this.container.emojis.success} Role menu cleared successfully.`);
  }

  async messageClean(message, args) {
    const msgid = await args.pick("string");

    const msg = await message.channel.messages.fetch(msgid)
    .catch(undefined);

    if (!msg) return message.reply(`${this.container.emojis.error} Message not found.`);

    if (msg.components.size == 0 || msg.author.id != this.container.client.user.id) return message.reply(`${this.container.emojis.error} This message cannot be used for .`);
    msg.edit({ components: [] });
    return message.reply(`${this.container.emojis.success} Role menu cleared successfully.`);
  }

  async chatInputDelete(interaction) {
    await interaction.deferReply();
    const mid = await interaction.options.getString("name").toLowerCase();

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) {
      return interaction.followUp(`${this.container.emojis.error} Role menu not found.`);
    }

    db.rolesMenu.pull(menu);
    await db.save();
    interaction.followUp(
      `${this.container.emojis.success} Deleted role menu \`${mid}\` successfully.`,
    );
  }

  async messageDelete(message, args) {
    const mid = await args.pick("string").toLowerCase();

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const menu = db.rolesMenu.find(r => r.id == mid);
    if (!menu) {
      return message.reply(`${this.container.emojis.error} Role menu not found.`);
    }

    db.rolesMenu.pull(menu);
    await db.save();
    message.reply(
      `${this.container.emojis.success} Deleted role menu \`${mid}\` successfully.`,
    );
  }
}
module.exports = {
  PingCommand,
};
