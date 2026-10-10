const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

const CUSTOM_EMOJI = /<(a?):[\w~]+:(\d+)>/;

class AddEmojiCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "addemoji",
      aliases: ["steal", "snag"],
      description: "Adds an emoji from another server, an image URL or an attached image.",
      examples: ["addemoji spongebob <:Spongebob:1199706626182086717>", "addemoji fox https://example.com/fox.png"],
      args: [
        { name: "name", type: "string", required: true, maxLength: 32, description: "The name for the new emoji" },
        { name: "emoji", type: "string", maxLength: 500, description: "An emoji from another server, or an image URL" },
        { name: "image", type: "attachment", description: "An image to use instead" },
      ],
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreateGuildExpressions],
      suggestedUserPermissions: [PermissionFlagsBits.CreateGuildExpressions],
      preconditions: ["module"],
    });
  }

  async run(ctx, { name, emoji: source, image }) {
    let attachment = null;
    if (source) {
      const custom = source.match(CUSTOM_EMOJI);
      if (custom) attachment = `https://cdn.discordapp.com/emojis/${custom[2]}.${custom[1] ? "gif" : "png"}`;
      else if (/^https?:\/\//i.test(source)) attachment = source;
      else return ctx.reply(`${emoji("error")} \`emoji\` should be a custom emoji or an image URL.`);
    }
    else if (image) {
      attachment = image.url;
    }
    if (!attachment) return ctx.reply(`${emoji("error")} No emoji, URL or image was given.`);

    await ctx.defer();
    try {
      const created = await ctx.guild.emojis.create({ attachment, name });
      return ctx.reply(`${created} : successfully added as \`${created.name}\`.`);
    }
    catch (err) {
      return ctx.reply(`${emoji("error")} ${err.message ?? err}`);
    }
  }
}

module.exports = { AddEmojiCommand };
