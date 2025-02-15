const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "automodreport",
      aliases: [],
      description: "Sets the channel the bot will send automod reports to",
      detailedDescription: {
        usage: "automod [channel] [pingrole]",
        examples: ["automod #reports @mods", "automod #automodflags"],
        args: ["channel : The channel to use", "pingrole : The role to ping when there's a flag"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  async messageRun(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const pingrole = await args.pick("role").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (channel) {
      db.automod.reportchannel = channel.id;
      db.automod.pingreport = (pingrole ? pingrole.id : "");

      db.save()
        .then(() => {
          message.reply(
            `:white_check_mark: Automod flags will now be reported to ${channel}.`,
          );
        })
        .catch((err) => {
          message.reply(`:x: ${err}`);
        });
    }
    else {
        db.automod.reportchannel = "";
        db.automod.pingreport = "";
  
        db.save()
          .then(() => {
            message.reply(
              `:white_check_mark: Automod reports channel was cleared.`,
            );
          })
          .catch((err) => {
            message.reply(`:x: ${err}`);
          });
    }
  }
}
module.exports = {
  PingCommand,
};
