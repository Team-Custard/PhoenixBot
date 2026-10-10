const fs = require("fs");
const path = require("path");
const { PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");

const OVERLAY = path.join(__dirname, "../../static/phoenixtrans.png");

class PhoenixAvatarCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "phoenixavatar",
      aliases: ["phoenixav", "pav"],
      description: "Creates a Phoenix logo from your avatar.",
      args: [{ name: "user", type: "user", description: "Whose avatar to use (defaults to you)" }],
      slash: { group: "utilities", name: "phoenixav" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user }) {
    user = user ?? ctx.user;
    await ctx.defer();
    const { createCanvas, loadImage } = require("@napi-rs/canvas");
    const canvas = createCanvas(1024, 1024);
    const drawing = canvas.getContext("2d");

    const avatar = await loadImage(user.displayAvatarURL({ extension: "png", forceStatic: true, size: 1024 }));
    drawing.drawImage(avatar, 0, 0, canvas.width, canvas.height);
    const overlay = await loadImage(await fs.promises.readFile(OVERLAY));
    drawing.drawImage(overlay, 0, 0, canvas.width, canvas.height);

    const attachment = new AttachmentBuilder(await canvas.encode("png"), { name: "phoenixav.png" });
    return ctx.reply({ files: [attachment] });
  }
}

module.exports = { PhoenixAvatarCommand };
