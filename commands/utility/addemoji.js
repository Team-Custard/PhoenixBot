const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "addemoji",
      aliases: ["steal", "snag"],
      description: "Adds an emoji from another server, attachment, or url.",
      detailedDescription: {
        usage: "addemoji <name> [emoji]",
        examples: ["addemoji spongebob <:Spongebob:1199706626182086717>"],
        args: [
          "name: The name of the emoji to use.",
          "emoji: The emoji, or url",
        ],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.CreateGuildExpressions,
      ],
      requiredUserPermissions: [PermissionFlagsBits.CreateGuildExpressions],
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1223451520176095326"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("addemoji")
        .setDescription("Adds an emoji from image, url, or another server.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The name of the emoji to add")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("An emoji from another server")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("The url of the emoji to add")
            .setRequired(false),
        )
        .addAttachmentOption((option) =>
          option
            .setName("image")
            .setDescription("The image of the emoji to add")
            .setRequired(false),
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(8796093022208),
    );
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();

    const emojiName = await interaction.options.getString("name");
    const serverEmoji = await interaction.options.getString("emoji", false);
    const emojiUrl = await interaction.options.getString("url", false);
    const emojiImage = await interaction.options.getAttachment("image", false);

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
            if (!emoji[1])
              return interaction.followUp(":x: Unable to resolve emoji.");
            await interaction.guild.emojis
              .create({ attachment: fetchedEmoji, name: emojiName })
              .then((e) =>
                interaction.followUp(
                  `${e} : successfully added as \`${e.name}\`.`,
                ),
              )
              .catch((err) => interaction.followUp(`:x: ${err}`));
          } else if ((emoji = animatedEmoteRegex.exec(serverEmoji))) {
            console.log(emoji[1]);
            const fetchedEmoji = `https://cdn.discordapp.com/emojis/${emoji[1]}.gif`;
            if (!emoji[1])
              return interaction.followUp(":x: Unable to resolve emoji.");
            await interaction.guild.emojis
              .create({ attachment: fetchedEmoji, name: emojiName })
              .then((e) =>
                interaction.followUp(
                  `${e} : successfully added as \`${e.name}\`.`,
                ),
              )
              .catch((err) => interaction.followUp(`:x: ${err}`));
          } else {
            interaction.followUp(":x: Couldn't find a valid emoji to paste.");
          }
        } else {
          return interaction.followUp(
            `:x: \`emoji\` field has incorrect data.`,
          );
        }
      } else if (emojiUrl) {
        await interaction.guild.emojis
          .create({ attachment: emojiUrl, name: emojiName })
          .then((e) =>
            interaction.followUp(`${e} : successfully added as \`${e.name}\`.`),
          )
          .catch((err) => interaction.followUp(`:x: ${err}`));
      } else if (emojiImage) {
        await interaction.guild.emojis
          .create({ attachment: emojiImage.url, name: emojiName })
          .then((e) =>
            interaction.followUp(`${e} : successfully added as \`${e.name}\`.`),
          )
          .catch((err) => interaction.followUp(`:x: ${err}`));
      }
    } else {
      return interaction.followUp(":x: No emojis specified.");
    }
  }

  async messageRun(message, args) {
    const emojiname = await args.pick("string");
    const emojiref = await args.pick("string").catch(() => undefined);

    if (emojiref) {
      if (emojiref.startsWith("http://") || emojiref.startsWith("https://")) {
        message.guild.emojis
          .create({ attachment: emojiref, name: emojiname })
          .then((e) =>
            message.reply(`${e} : successfully added as \`${e.name}\`.`),
          )
          .catch((err) => message.reply(`:x: ${err}`));
      } else {
        const hasEmoteRegex = /<a?:.+:\d+>/gm;
        const emoteRegex = /<:.+:(\d+)>/gm;
        const animatedEmoteRegex = /<a:.+:(\d+)>/gm;
        let emoji;
        if (emojiref.match(hasEmoteRegex)) {
          if ((emoji = emoteRegex.exec(emojiref))) {
            console.log(emoji[1]);
            const fetchedEmoji = `https://cdn.discordapp.com/emojis/${emoji[1]}.png`;
            if (!emoji[1]) return message.reply(":x: Unable to resolve emoji.");
            await message.guild.emojis
              .create({ attachment: fetchedEmoji, name: emojiname })
              .then((e) =>
                message.reply(`${e} : successfully added as \`${e.name}\`.`),
              )
              .catch((err) => message.reply(`:x: ${err}`));
          } else if ((emoji = animatedEmoteRegex.exec(emojiref))) {
            console.log(emoji[1]);
            const fetchedEmoji = `https://cdn.discordapp.com/emojis/${emoji[1]}.gif`;
            if (!emoji[1]) return message.reply(":x: Unable to resolve emoji.");
            await message.guild.emojis
              .create({ attachment: fetchedEmoji, name: emojiname })
              .then((e) =>
                message.reply(`${e} : successfully added as \`${e.name}\`.`),
              )
              .catch((err) => message.reply(`:x: ${err}`));
          } else {
            message.reply(":x: Couldn't find a valid emoji to paste.");
          }
        } else if (message.attachments.first()) {
          await message.guild.emojis
            .create({
              attachment: message.attachments.first().url,
              name: emojiname,
            })
            .then((e) =>
              message.reply(`${e} : successfully added as \`${e.name}\`.`),
            )
            .catch((err) => message.reply(`:x: ${err}`));
        } else {
          message.reply(":x: Couldn't find a valid emoji to paste.");
        }
      }
    }
  }
}
module.exports = {
  PingCommand,
};
