const { StringSelectMenuInteraction } = require("discord.js");
const serverSettings = require("../tools/SettingsSchema");

const {
  InteractionHandler,
  InteractionHandlerTypes,
} = require("@sapphire/framework");

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

    /**
     * @param {StringSelectMenuInteraction} interaction
     */
    async run(interaction) {
        const mid = (interaction.customId.slice().trim().split('-'))[1];

        const serverdb = await serverSettings.findById(interaction.guild.id).cacheQuery();
        const roledb = serverdb.rolesMenu.find(r => r.id == mid);
        if (!roledb) return interaction.reply(`${this.container.emojis.error} The id \`${mid}\` is not found.`);

        await interaction.deferReply({ ephemeral: true });

        const pickedroles = interaction.values;
        const curroles = interaction.member.roles.cache.map(r => r.id);

        if (roledb.menutype == 'multi') {
            for (let i = 0; i < pickedroles.length; i++) {
                if (curroles.includes(pickedroles.at(i))) {
                    curroles.splice(curroles.indexOf(pickedroles.at(i)), 1);
                }
                else {
                    curroles.push(pickedroles.at(i));
                }
            }
        }
        else {
            const alreadypicked = curroles.includes(pickedroles[0]);
            console.log(curroles);
            for (let i = 0; i < curroles.length; i++) {
                if (roledb.roles.find(r => r.role == curroles[i])) {
                    console.log("Removing %d from curroles", curroles[i]);
                    curroles.splice(i, 1);
                }
            }
            if (!alreadypicked) curroles.push(pickedroles[0]);
            console.log(curroles);
        }

        await interaction.message.edit({ components: interaction.message.components });

        interaction.member.roles.set(curroles, `Role menu`)
        .then(() => interaction.followUp(`${this.container.emojis.success} Updated your roles successfully.`))
        .catch((e) => interaction.followUp(`${this.container.emojis.error} Role assignment failed. ${e}`));
    }
}

module.exports = {
  MenuHandler
};