const { Listener, Events, Command } = require("@sapphire/framework");
const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, Message, ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      name: "interactionCommandLogger",
      event: Events.ChatInputCommandFinish,
    });
  }
  /**
   * @param {ChatInputCommandInteraction} interaction
   * @param {Command} command
   */
  async run(interaction, command) {
    if (!isGuildBasedChannel(interaction.channel)) return;

    if (interaction.user?.bot) return;

    const db = await ServerSettings.findById(interaction.guild.id).cacheQuery();
    if (db.logging.commands) {
      const channel = await interaction.guild.channels
        .fetch(db.logging.commands)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        const embed = new EmbedBuilder()
          .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({
              dynamic: true,
              size: 256,
            }),
          })
          .setDescription(
            `${interaction.user} executed the slash command ${command.name} in ${interaction.channel}\n**Interaction:**\n/${interaction.commandName} ${interaction.options?.getSubcommandGroup(false) ? `${interaction.options?.getSubcommandGroup()} `:''}${interaction.options?.getSubcommand(false) ? `${interaction.options.getSubcommand()} `:''}${interaction.options?.getSubcommand(false) ? (interaction.options?.getSubcommandGroup(false) ? interaction.options?.data[0].options[0].options?.map(i => `[${i.name}: ${i.value}]`).join(" ") : interaction.options?.data[0].options?.map(i => `[${i.name}: ${i.value}]`).join(" ")) : interaction.options?.data.map(i => `[${i.name}: ${i.value}]`).join(" ")}`,
          )
          .setColor(Colors.Orange)
          .setTimestamp(new Date());


        await webhook
          .send({
            // content: '',
            username: this.container.client.user.username,
            avatarURL: this.container.client.user.displayAvatarURL({
              extension: "png",
              size: 512,
            }),
            embeds: [embed],
          })
          .catch((err) =>
            console.error(`[error] Error on sending webhook`, err),
          );
      }
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
