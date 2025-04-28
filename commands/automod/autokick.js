const { Command, container } = require("@sapphire/framework");
const {
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "autokick",
      aliases: [],
      description:
        "Configures the autokick feature, which automatically kicks members without a role if they don't get a role after some time.",
      detailedDescription: {
        usage: "autokick [timer] [required-role]",
        examples: ["autokick 7d", "autokick 3d @member"],
        flags: [`timer : How long to wait before the member gets kicked`, `required-role : An optional role needed to avoid getting kicked`]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const theTime = require("ms")(await args.pick("string"));
    const requiredRole = await args.pick("role").catch(() => undefined);

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (theTime == 0) {
      db.automod.autokick.duration = 0;
      await db.save();
      return await message.reply(`${this.container.emojis.success} Autokick has been disabled.`)
    }

    if (theTime < 15_000) {
      return await message.reply(`${this.container.emojis.error} The time must be greater than 15 seconds.`)
    }

    if (requiredRole) {
      db.automod.autokick.duration = theTime;
      db.automod.autokick.neededRole = requiredRole.id;
      await db.save();
      return await message.reply({ content: `${this.container.emojis.success} Autokick has been enabled. Users that join will need to get the ${requiredRole} role by ${await require('pretty-ms')(theTime, {verbose: true})} to avoid getting kicked.`, allowedMentions: { parse: [] } });
    }

    db.automod.autokick.duration = theTime;
    await db.save();
    return await message.reply({ content: `${this.container.emojis.success} Autokick has been enabled. Users that join will need to get any role by ${await require('pretty-ms')(theTime, {verbose: true})} to avoid getting kicked.`, allowedMentions: { parse: [] } });
  }
}
module.exports = {
  PingCommand,
};
