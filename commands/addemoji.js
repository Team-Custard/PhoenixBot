const { Command } = require('@sapphire/framework');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, { ...options });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1223451520176095326"];
    registry.registerChatInputCommand((builder) =>
      builder.setName('addemoji').setDescription('Adds an emoji from image, url, or another server.')
      .addStringOption(option => option.setName('name').setDescription('The name of the emoji to add').setRequired(true))
      .addStringOption(option => option.setName('emoji').setDescription('An emoji from another server').setRequired(false))
      .addStringOption(option => option.setName('url').setDescription('The url of the emoji to add').setRequired(false))
      .addAttachmentOption(option => option.setName('image').setDescription('The image of the emoji to add').setRequired(false))
      .setDMPermission(false)
      .setDefaultMemberPermissions(8796093022208)
    );
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();

    const emojiName = await interaction.options.getString('name');
    const serverEmoji = await interaction.options.getString('emoji', false);
    const emojiUrl = await interaction.options.getString('url', false);
    const emojiImage = await interaction.options.getAttachment('image', false);

    if (serverEmoji || emojiUrl || emojiImage) {
        if (serverEmoji) {
            const hasEmoteRegex = /<a?:.+:\d+>/gm;
            const emoteRegex = /<:.+:(\d+)>/gm;
            const animatedEmoteRegex = /<a:.+:(\d+)>/gm;

            let emoji;
            if (serverEmoji.match(hasEmoteRegex)) {
                if ((emoji = emoteRegex.exec(serverEmoji))) {
                    console.log(emoji[1]);
                    const fetchedEmoji = `https://cdn.discordapp.com/emojis/${emoji[1]}.png`;
                    if (!emoji[1]) return interaction.followUp(':x: Unable to resolve emoji.');
                    await interaction.guild.emojis.create({ attachment: fetchedEmoji, name: emojiName })
                    .then((e) => interaction.followUp(`${e} : successfully added as \`${e.name}\`.`))
                    .catch((err) => interaction.followUp(`:x: ${err}`));
                }
                else if ((emoji = animatedEmoteRegex.exec(serverEmoji))) {
                    console.log(emoji[1]);
                    const fetchedEmoji = `https://cdn.discordapp.com/emojis/${emoji[1]}.gif`;
                    if (!emoji[1]) return interaction.followUp(':x: Unable to resolve emoji.');
                    await interaction.guild.emojis.create({ attachment: fetchedEmoji, name: emojiName })
                    .then((e) => interaction.followUp(`${e} : successfully added as \`${e.name}\`.`))
                    .catch((err) => interaction.followUp(`:x: ${err}`));
                }
                else {
                    interaction.followUp(":x: Couldn't find a valid emoji to paste.");
                }
            }
            else {return interaction.followUp(`:x: \`emoji\` field has incorrect data.`);}
        }
 else if (emojiUrl) {
          await interaction.guild.emojis.create({ attachment: emojiUrl, name: emojiName })
                    .then((e) => interaction.followUp(`${e} : successfully added as \`${e.name}\`.`))
                    .catch((err) => interaction.followUp(`:x: ${err}`));
        }
 else if (emojiImage) {
          await interaction.guild.emojis.create({ attachment: emojiImage.url, name: emojiName })
                    .then((e) => interaction.followUp(`${e} : successfully added as \`${e.name}\`.`))
                    .catch((err) => interaction.followUp(`:x: ${err}`));
        }
    }
 else {return interaction.followUp(':x: No emojis specified.');}
  }
}
module.exports = {
  PingCommand
};