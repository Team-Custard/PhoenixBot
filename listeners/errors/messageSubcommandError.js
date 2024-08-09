const { Listener } = require("@sapphire/framework");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class messageSubcommandError extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageSubcommandError",
    });
  }
  async run(error, { message, command }) {
    if (require('../../config.json').process.errorwebhook) {
      const embed = new EmbedBuilder()
      .setAuthor({
        name: this.container.client.user.username,
        iconURL: this.container.client.user.displayAvatarURL({dynamic:true})
      })
      .setTitle(`Error occured while running the prefix subcommand ${command.name}`)
      .setDescription(
        `\`\`\`${error.stack}\`\`\``
      )
      .setColor(Colors.Orange)
      .setFooter({ text: `Error occured` })
      .setTimestamp(new Date())

      const actionRow = new ActionRowBuilder()
      .addComponents(new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(`Fix the bug`)
        .setURL(`https://github.com/team-custard/phoenixbot/tree/staging`)
      )

      const channel = await this.container.client.channels.fetch(process.env["errwebhookid"])
      .catch(() => undefined);
      if (channel) {
        const webhook = await require('../../tools/webhookFetch').find(channel);
        if (webhook) webhook.send({
          username: this.container.client.user.username,
          avatarURL: this.container.client.user.displayAvatarURL({size: 512, extension: "png"}),
          embeds: [embed],
          components: [actionRow]
        }).then(() => console.log(`Webhook sent`))
        .catch(() => console.log(`Error while sending error webhook`));
      }
    }
    else console.error(error);

    message.reply({ content: `${this.container.emojis.error} ${error}` });
  }
}
module.exports = {
  messageSubcommandError,
};
