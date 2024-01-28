const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, EmbedBuilder, Colors, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../../settings.json');
const database = require("../../Tools/SettingsSchema");


class PingCommand extends Command {
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
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const option = await args.pick('string').catch(() => "view");

    switch (option) {
        case 'create': {
          const mid = await args.pick('string');
          const name = await args.pick('string');
          const type = await args.pick('string');
          console.log(`${mid}, ${name}, ${type}`);

          if (type.toLowerCase() !== "one" && type.toLowerCase() !== "multi") return send(message, `${emojis.error} Type must be \`multi\` or \`one\``);

          try {
            const serverdb = await database.findById(message.guild.id).exec();
            console.log(serverdb.rolesMenu);
            if (serverdb.rolesMenu.find(r => r.id == mid)) return send(message, `${emojis.error} The id \`${mid}\` is already taken. Use \`rolemenu message ${mid}\` to resend the role menu or use \`rolemenu delete ${mid}\` to remove it.`);
            serverdb.rolesMenu.push({ id: mid, name, menutype: type });
            serverdb.save();
            await send(message, { content: `${emojis.success} Successfully created role menu with id \`${mid}\`. Use \`rolemenu add\` to add roles to this and use \`rolemenu message\` when you are done.` });
          }
          catch (err) {
            console.warn('Database error', err);
            await send(message, { content : `${emojis.error} There was a database error.` });
          }
          break;
        }
        case 'add': {
            const mid = await args.pick('string');
            const emoji = await args.pick('emoji');
            const role = await args.pick('role');

            if (role.managed) return send(message, `${emojis.error} The specified role is managed. The role belongs to a bot or integration and is unassignable.`);
            if (!role.editable) return send(message, `${emojis.error} It appears I cannot modify the specified role so I can't hand it out. I need a role higher than the specified role and I need the \`MANAGE_ROLES\` permission.`);

            try {
                const serverdb = await database.findById(message.guild.id).exec();
                const roleindex = serverdb.rolesMenu.find(r => r.id == mid);
                if (!roleindex) return send(message, `${emojis.error} The id \`${mid}\` is not found.`);
                const foundrole = roleindex.roles.find(r => r.role == role.id);
                if (foundrole) return send(message, `${emojis.error} The specified role already exists in the role menu.`);
                
                roleindex.roles.push({ role: role.id, emoji: emoji.id });
                serverdb.save();
                await send(message, { content: `${emojis.success} Successfully added the role to role menu id: ${mid}.` });
              }
              catch (err) {
                console.warn('Database error', err);
                await send(message, { content : `${emojis.error} There was a database error.` });
              }
              break;
        }
        case 'remove': {
            const mid = await args.pick('string');
            const role = await args.pick('role');

            try {
                const serverdb = await database.findById(message.guild.id).exec();
                const roleindex = serverdb.rolesMenu.find(r => r.id == mid);
                if (!roleindex) return send(message, `${emojis.error} The id \`${mid}\` is not found.`);
                const foundrole = roleindex.roles.find(r => r.role == role.id);
                if (!foundrole) return send(message, `${emojis.error} The role was not found in the menu.`);
                
                roleindex.roles.pull(foundrole);
                serverdb.save();
                await send(message, { content: `${emojis.success} Successfully added the role to role menu id: ${mid}.` });
              }
              catch (err) {
                console.warn('Database error', err);
                await send(message, { content : `${emojis.error} There was a database error.` });
              }
              break;
        }
        case 'message': {
            const mid = await args.pick('string');

            try {
                const serverdb = await database.findById(message.guild.id).exec();
                const roledb = serverdb.rolesMenu.find(r => r.id == mid);
                if (!roledb) return send(message, `${emojis.error} The id \`${mid}\` is not found.`);

                // roledb.roles.forEach(async (r) => {
                //    const role = await message.guild.roles.fetch(r.role);
                //    const emoji = await this.container.client.emojis.resolveId(r.emoji);
                //    return roledesc.push({ role, emoji });
                // });
                // console.log(roledesc.map((r) => `${r.emoji} : ${r.role}`).join('\n'));
                const embed = new EmbedBuilder()
                .setTitle(roledb.name)
                .setDescription(`Select ${roledb.menutype == 'multi' ? 'some roles' : 'one role'} from the dropdown menu below.`)
                .setFooter({ text: `Role menu id: ${mid}` })
                .setColor(Colors.Orange);
                const menu = new StringSelectMenuBuilder()
                .setCustomId(`rm-${mid}`)
                .setPlaceholder('Select a role.')
                .setMinValues(0)
                .setMaxValues(roledb.menutype == 'multi' ? roledb.roles.length : 1);

                for (let i = 0; i < roledb.roles.length; i++) {
                    const role = await message.guild.roles.fetch(roledb.roles[i].role);
                    // const emoji = await this.container.client.emojis.resolveId(roledb.roles[i].emoji);
                    menu.addOptions(
                      new StringSelectMenuOptionBuilder()
                      .setEmoji(roledb.roles[i].emoji)
                      .setLabel(role.name)
                      .setValue(role.id)
                    );
                }


                // if (roledb.menutype == 'multi') {
                // menu.setMinValues(1)
                // .setMaxValues(roledb.roles.length);
                // }

                const component = new ActionRowBuilder()
                .addComponents(menu);
                await send(message, { embeds: [embed], components: [component] });
              }
              catch (err) {
                console.warn('Database error', err);
                await send(message, { content : `${emojis.error} There was a database error.` });
              }
              break;
        }
        case 'delete': {
          const mid = await args.pick('string');
            try {
              const serverdb = await database.findById(message.guild.id).exec();
              const roledb = serverdb.rolesMenu.find(r => r.id == mid);
              if (!roledb) return send(message, `${emojis.error} The id \`${mid}\` is not found.`);
              serverdb.rolesMenu.pull(roledb);
              await serverdb.save();
              await send(message, { content: `${emojis.success} Successfully deleted role menu with id \`${mid}\`.` });
            }
            catch (err) {
              console.warn('Database error', err);
              await send(message, { content : `${emojis.error} There was a database error.` });
            }
            break;
          }
        default: {
            const serverdb = await database.findById(message.guild.id).exec();
            const enabled = serverdb.modonly;
            await send(message, { content: `Modonly is currently ${enabled == true ? `**enabled**.` : `**disabled**.`} Modonly is a setting that limits the bot access to mods only.` });
        }
    }
  }
}
module.exports = {
  PingCommand
};