const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const fs = require('fs');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "phoenixavatar",
      aliases: ["phoenixav", "pav"],
      description: "Creates a Phoenix logo from your avatar.",
      detailedDescription: {
        usage: "phoenixavatar [user]",
        examples: ["phoenixavatar 763631377152999435"],
        args: ["user: The user to use."],
      },
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
      ],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    let user = await args.pick("user").catch(() => undefined);
    if (!user) user = message.author;

    console.log("Creating image 1");
    const { createCanvas, loadImage } = require("@napi-rs/canvas");
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext("2d");

    console.log("Creating image 2");
    await loadImage(user.displayAvatarURL({ format: "png", size: 1024 }))
      .then(async (img) => {
        ctx.drawImage(img, 0, 0, canvas.height, canvas.width);
      })
      .catch((err) => {
        return message.reply(`${this.container.emojis.error} ${err}`);
      });

    console.log("Creating image 3");
    const img = fs.readFileSync(__dirname+"/./../../static/phoenixtrans.png");
    await loadImage(img.buffer)
      .then(async (img) => {
        ctx.drawImage(img, 0, 0, canvas.height, canvas.width);
      })
      .catch((err) => {
        return message.reply(`${this.container.emojis.error} ${err}`);
      });

    console.log("Creating image 4");
    const attachment = new AttachmentBuilder(await canvas.encode("png"), {
      name: `phoenixav.png`,
    });
    await message.reply({
      files: [attachment],
    });
  }
}
module.exports = {
  PingCommand,
};
