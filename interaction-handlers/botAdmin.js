const { ButtonInteraction, Colors, ModalBuilder, TextInputStyle, ActionRowBuilder, TextInputBuilder } = require("discord.js");
const serverSettings = require("../tools/SettingsSchema");
const {
    InteractionHandler,
    InteractionHandlerTypes,
  } = require("@sapphire/framework");
  
  class MenuHandler extends InteractionHandler {
    constructor(ctx, options) {
      super(ctx, {
        ...options,
        interactionHandlerType: InteractionHandlerTypes.Button,
      });
    }
  
    parse(interaction) {
      if (
        interaction.customId.startsWith("BOTADMIN")
      ) {
        return this.some();
      }
  
      return this.none();
    }
  
    /**
     * @param {ButtonInteraction} interaction 
     */
    async run(interaction) {
      if (interaction.customId.startsWith("BOTADMIN")) {
        if (!interaction.member.roles.cache.has('1276464446264573995')) return interaction.reply({ content: `You don't have the bot admin role.`, ephemeral: true });
        const arg = interaction.customId.split('-');
        if (arg[1] == 'LeaveGuild') {
            const guild = await this.container.client.guilds.fetch(arg[2]).catch(() => undefined);
            if (!guild) return interaction.reply({ content: `${this.container.emojis.error} Not in guild.`, ephemeral: true });
            await guild.leave();
            interaction.reply({
                content: `${this.container.emojis.success} Left guild **${guild.name}**`,
                ephemeral: true
            });
        }
        else if (arg[1] == 'BlacklistGuild') {
            const guild = await this.container.client.guilds.fetch(arg[2]).catch(() => undefined);
            if (!guild) return interaction.reply({ content: `${this.container.emojis.error} Not in guild.`, ephemeral: true });
            const db = await serverSettings
                .findById(guild.id, serverSettings.upsert)
                .cacheQuery();
                
            const modal = new ModalBuilder()
                    .setCustomId("ModalBlacklistReason")
                    .setTitle("Blacklist")
                    .addComponents([
                      new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                        .setCustomId("ModalReasonField")
                        .setLabel("Reason")
                        .setMaxLength(1024)
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                      ),
                    ])
                    try {
                        await interaction.showModal(modal);
                        const modalResponse = await interaction.awaitModalSubmit({ filter: (i) => (i.customId == "ModalBlacklistReason" && i.user.id == interaction.user.id), time: 900_000 });
                        await modalResponse.deferReply({ ephemeral: true });
                      
                        db.blacklisted = true;
                        db.blacklistReason = `(${interaction.user.tag}) ${await modalResponse.fields.getTextInputValue('ModalReasonField')}`
                        await db.save();
                        await guild.leave();

                        await modalResponse.followUp(`${this.container.emojis.success} Blacklisted guild **${guild.name}**.`);
                        const logChannel = await this.container.client.channels.fetch('1337678910380310558');
                        if (logChannel) {
                        logChannel.send({
                            content: `Guild ${guild.name} (\`${guild.id}\`) was blacklisted. Reason: ${await modalResponse.fields.getTextInputValue('ModalReasonField')}`
                        });
                        }
                    }
                    catch (err) {
                      console.error('Error executing author embed. ',err);
                      interaction.followUp({ content: `${this.container.emojis.error} ${err}`, ephemeral: true });
                    }
        }
      }
    }
  }
  
  module.exports = {
    MenuHandler,
  };
  