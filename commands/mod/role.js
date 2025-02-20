const { Subcommand } = require("@sapphire/plugin-subcommands");
const { ApplicationCommandRegistry, BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits, ChatInputCommandInteraction, PermissionsBitField, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const { setTimeout } = require("timers/promises");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "role",
      aliases: [`rolemod`, `editrole`],
      description: "Modifies a member's role",
      detailedDescription: {
        usage: "rolemod <subcommand> <member> <role>",
        examples: ["rolemod add sylveondev member", "rolemod server"]
      },
      cooldownDelay: 15_000,
      cooldownScope: BucketScope.Guild,
      suggestedUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],
      subcommands: [{
        name: "add",
        chatInputRun: "chatInputAssign",
        messageRun: "messageAssign"
      }, {
        name: "remove",
        chatInputRun: "chatInputRemove",
        messageRun: "messageRemove"
      }, {
        name: "whitelist",
        type: "group",
        entries: [
          { name: "add", chatInputRun: "chatInputAddWhitelist", messageRun: "messageAddWhitelist" },
          { name: "remove", chatInputRun: "chatInputRemoveWhitelist", messageRun: "messageRemoveWhitelist" },
          { name: "display", chatInputRun: "chatInputShowWhitelist", messageRun: "messageShowWhitelist" },
        ],
        requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
      }],
      preconditions: ["module"]
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand(command => 
      command.setName("role")
      .setDescription("Update a member's role")
      .addSubcommand(subcommand => 
        subcommand.setName("add")
        .setDescription("Adds a role to a member")
        .addUserOption(input =>
          input.setName("member")
          .setDescription("The member to assign the role to")
          .setRequired(true)
        )
        .addRoleOption(input =>
          input.setName("role")
          .setDescription("The role to assign")
          .setRequired(true)
        )
        .addStringOption(input =>
          input.setName("reason")
          .setDescription("The reason for the role assignment")
        )
      )
      .addSubcommand(subcommand => 
        subcommand.setName("remove")
        .setDescription("Removes a role from a member")
        .addUserOption(input =>
          input.setName("member")
          .setDescription("The member to remove the role from")
          .setRequired(true)
        )
        .addRoleOption(input =>
          input.setName("role")
          .setDescription("The role to remove")
          .setRequired(true)
        )
        .addStringOption(input =>
          input.setName("reason")
          .setDescription("The reason for the role assignment")
        )
      )
      .addSubcommandGroup(group => 
        group.setName("whitelist")
        .setDescription("Whitelist role stuff")
        .addSubcommand(subcommand => 
          subcommand.setName("add")
          .setDescription("Adds a role to the whitelist")
          .addRoleOption(input =>
            input.setName("role")
            .setDescription("The role")
            .setRequired(true)
          )
        )
        .addSubcommand(subcommand => 
          subcommand.setName("remove")
          .setDescription("Remove a role from the whitelist")
          .addRoleOption(input =>
            input.setName("role")
            .setDescription("The role")
            .setRequired(true)
          )
        )
        .addSubcommand(subcommand => 
          subcommand.setName("display")
          .setDescription("Displays all roles in the whitelist")
        )
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(1024),
    )
  }

  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputAssign(interaction) {
    await interaction.deferReply();
    const member = await interaction.options.getMember('member');
    const role = await interaction.options.getRole('role');
    const reason = await interaction.options.getString('reason') || 'No reason specified';

    if (interaction.member == member) {
      return interaction.followUp(`${this.container.emojis.error} You can't give yourself roles with this command.`);
    }
    if (
      member.roles?.highest.position >=
      interaction.guild.members.me.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} I'm not high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      member.roles?.highest.position >= interaction.member.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      role?.position >= interaction.member.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to hand out this role.`,
      );
    }
    if (
      role?.position >= interaction.guild.members.me.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} I cannot hand out this role to members because the role is higher than my highest role in the role hierarchy. You need to move my role in the roles list above the role your're trying to hand out.`,
      );
    }
    if (member.roles.cache.has(role.id)) {
      return interaction.followUp(
        `${this.container.emojis.error} This user already has the role you're trying to add.`,
      );
    }
    if (!member.manageable) {
      return interaction.followUp(
        `${this.container.emojis.error} This user is not manageable.`,
      );
    }

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    
    if (db.whitelistedRoles.length > 0) {
      if (db.whitelistedRoles.findIndex(r => r == role.id) == -1) return interaction.followUp(`${this.container.emojis.error} This role is not in the whitelist.`)
    }

    member.roles.add(role, `(Role added by ${interaction.user.tag}) ${reason}`);
    interaction.followUp({ content: `${this.container.emojis.success} Added ${role} to **${member.user.tag}**.`, allowedMentions: { parse: [] } });
  }
  async messageAssign(message, args) {
    const member = await args.pick('member');
    const role = await args.pick('role');
    const reason = await args.rest('reason').catch(() => 'No reason specified');

    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} You can't give yourself roles with this command.`);
    }
    if (
      member.roles?.highest.position >=
      message.guild.members.me.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I'm not high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      member.roles?.highest.position >= message.member.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      role?.position >= message.member.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to hand out this role.`,
      );
    }
    if (
      role?.position >= message.guild.members.me.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I cannot hand out this role to members because the role is higher than my highest role in the role hierarchy. You need to move my role in the roles list above the role your're trying to hand out.`,
      );
    }
    if (member.roles.cache.has(role.id)) {
      return message.reply(
        `${this.container.emojis.error} This user already has the role you're trying to add.`,
      );
    }
    if (!member.manageable) {
      return message.reply(
        `${this.container.emojis.error} This user is not manageable.`,
      );
    }

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    
    if (db.whitelistedRoles.length > 0) {
      if (db.whitelistedRoles.findIndex(r => r == role.id) == -1) return message.reply(`${this.container.emojis.error} This role is not in the whitelist.`)
    }

    member.roles.add(role, `(Role added by ${message.author.tag}) ${reason}`);
    message.reply({ content: `${this.container.emojis.success} Added ${role} to **${member.user.tag}**.`, allowedMentions: { parse: [] } });
  }

  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRemove(interaction) {
    await interaction.deferReply();
    const member = await interaction.options.getMember('member');
    const role = await interaction.options.getRole('role');
    const reason = await interaction.options.getString('reason') || 'No reason specified';

    if (interaction.member == member) {
      return interaction.followUp(`${this.container.emojis.error} You can't remove roles from yourself yourself with this command.`);
    }
    if (
      member.roles?.highest.position >=
      interaction.guild.members.me.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} I'm not high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      member.roles?.highest.position >= interaction.member.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      role?.position >= interaction.member.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to take away this role.`,
      );
    }
    if (
      role?.position >= interaction.guild.members.me.roles?.highest.position
    ) {
      return interaction.followUp(
        `${this.container.emojis.error} I cannot take away this role to members because the role is higher than my highest role in the role hierarchy. You need to move my role in the roles list above the role your're trying to take away.`,
      );
    }
    if (!member.roles.cache.has(role.id)) {
      return interaction.followUp(
        `${this.container.emojis.error} This user doesn't have the role you're trying to remove.`,
      );
    }
    if (!member.manageable) {
      return interaction.followUp(
        `${this.container.emojis.error} This user is not manageable.`,
      );
    }

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    
    if (db.whitelistedRoles.length > 0) {
      if (db.whitelistedRoles.findIndex(r => r == role.id) == -1) return interaction.followUp(`${this.container.emojis.error} This role is not in the whitelist.`)
    }

    member.roles.remove(role, `(Role removed by ${interaction.user.tag}) ${reason}`);
    interaction.followUp({ content: `${this.container.emojis.success} Removed ${role} from **${member.user.tag}**.`, allowedMentions: { parse: [] } });
  }
  async messageRemove(message, args) {
    const member = await args.pick('member');
    const role = await args.pick('role');
    const reason = await args.rest('reason').catch(() => 'No reason specified');

    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} You can't give yourself roles with this command.`);
    }
    if (
      member.roles?.highest.position >=
      message.guild.members.me.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I'm not high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      member.roles?.highest.position >= message.member.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to manage this member.`,
      );
    }
    if (
      role?.position >= message.member.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to hand out this role.`,
      );
    }
    if (
      role?.position >= message.guild.members.me.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I cannot hand out this role to members because the role is higher than my highest role in the role hierarchy. You need to move my role in the roles list above the role your're trying to hand out.`,
      );
    }
    if (!member.roles.cache.has(role.id)) {
      return interaction.followUp(
        `${this.container.emojis.error} This user doesn't have the role you're trying to remove.`,
      );
    }
    if (!member.manageable) {
      return message.reply(
        `${this.container.emojis.error} This user is not manageable.`,
      );
    }

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    
    if (db.whitelistedRoles.length > 0) {
      if (db.whitelistedRoles.findIndex(r => r == role.id) == -1) return message.reply(`${this.container.emojis.error} This role is not in the whitelist.`)
    }

    member.roles.remove(role, `(Role removed by ${message.author.tag}) ${reason}`);
    message.reply({ content: `${this.container.emojis.success} Removed ${role} from **${member.user.tag}**.`, allowedMentions: { parse: [] } });
  }

  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputAddWhitelist(interaction) {
    await interaction.deferReply();
    const role = await interaction.options.getRole('role');
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    if (db.whitelistedRoles.findIndex(r => r == role.id) > -1) return interaction.followUp(`${this.container.emojis.error} That role was already added to the whitelist.`);
    db.whitelistedRoles.push(role.id);
    await db.save();
    interaction.followUp({ content: `${this.container.emojis.success} Added ${role} to the whitelist`, allowedMentions: { parse: [] } });
  }
  async messageAddWhitelist(message, args) {
    const role = await args.pick('role');
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    if (db.whitelistedRoles.findIndex(r => r == role.id) > -1) return message.reply(`${this.container.emojis.error} That role was already added to the whitelist.`);
    db.whitelistedRoles.push(role.id);
    await db.save();
    message.reply({ content: `${this.container.emojis.success} Added ${role} to the whitelist`, allowedMentions: { parse: [] } });
  }
  
  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRemoveWhitelist(interaction) {
    await interaction.deferReply();
    const role = await interaction.options.getRole('role');
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    const ind = db.whitelistedRoles.findIndex(r => r == role.id);
    if (ind == -1) return interaction.followUp(`${this.container.emojis.error} That role was not added to the whitelist.`);
    db.whitelistedRoles.splice(ind, 1);
    await db.save();
    interaction.followUp({ content: `${this.container.emojis.success} Removed ${role} from the whitelist`, allowedMentions: { parse: [] } });
  }
  async messageRemoveWhitelist(message, args) {
    const role = await args.pick('role');
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    const ind = db.whitelistedRoles.findIndex(r => r == role.id);
    if (ind == -1) return message.reply(`${this.container.emojis.error} That role was not added to the whitelist.`);
    db.whitelistedRoles.splice(ind, 1);
    await db.save();
    message.reply({ content: `${this.container.emojis.success} Removed ${role} from the whitelist`, allowedMentions: { parse: [] } });
  }
  
  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputShowWhitelist(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    if (db.whitelistedRoles.length == 0) return interaction.followUp(`${this.container.emojis.info} There are no roles in the whitelist. By default all roles below the moderator in the role list can manage can be given to users. If you would like to override this, you can add roles to the whitelist, which will make it that only the roles you approve of can be handed out.`)
    const embed = new EmbedBuilder()
    .setDescription(db.whitelistedRoles.map(r => `<@&${r}>`).join(', '))
    .setColor(Colors.Orange);
    interaction.followUp({ embeds: [embed] });
  }
  async messageShowWhitelist(message) {
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    if (db.whitelistedRoles.length == 0) return message.reply(`${this.container.emojis.info} There are no roles in the whitelist. By default all roles below the moderator in the role list can manage can be given to users. If you would like to override this, you can add roles to the whitelist, which will make it that only the roles you approve of can be handed out.`)
    const embed = new EmbedBuilder()
    .setDescription(db.whitelistedRoles.map(r => `<@&${r}>`).join(', '))
    .setColor(Colors.Orange);
    message.reply({ embeds: [embed] });
  }

}
module.exports = {
  PingCommand,
};
