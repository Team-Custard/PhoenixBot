const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const database = require('../Tools/SettingsSchema');
const { emojis } = require('../settings.json');

class MenuHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu
    });
  }

  parse(interaction) {
    if (!interaction.customId.startsWith('rm-')) return this.none();

    return this.some();
  }

  async run(interaction) {
    const mid = (interaction.customId.slice().trim().split('-'))[1];

    const serverdb = await database.findById(interaction.guild.id).exec();
    const roledb = serverdb.rolesMenu.find(r => r.id == mid);
    if (!roledb) return interaction.reply(`${emojis.error} The id \`${mid}\` is not found.`);
    const menuroles = roledb.roles.map(r => r.role);
    const memberroles = interaction.member.roles.cache.map(r => r.id);
    // console.log(memberroles);

    // Romoves rolemenu roles from the member
    for (let i = 0; i < menuroles.length; i++) {
      if (memberroles.find(r => r == menuroles[i])) {
        memberroles.splice(memberroles.indexOf(menuroles[i]), 1);
      }
    }
    // Adds the chosen rolemenu role
    for (let i = 0; i < interaction.values.length; i++) {
      const role = menuroles.find(r => r == interaction.values[i]);
      if (role) {
        memberroles.push(interaction.values[i]);
      }
    }

    // Assign 
    interaction.member.roles.set(memberroles, `(${this.container.client.user.tag}) Assigning roles from role menu ${mid}.`)
    .then(async () => {
      await interaction.reply({
        // Remember how we can have multiple values? Let's get the first one!
        content: `${mid} : ${emojis.success} Set your roles successfully.`,
        ephemeral: true
      });
    })
    .catch(async (err) => {
      await interaction.reply({
        // Remember how we can have multiple values? Let's get the first one!
        content: `${mid} : ${emojis.error} There was an error while setting your roles.\n\`\`\`${err}\`\`\``,
        ephemeral: true
      });
    });
  }
}
module.exports = {
  MenuHandler
};