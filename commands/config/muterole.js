const { Command } = require("@sapphire/framework");
const { Colors, PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "muterole",
      aliases: ["mutedrole"],
      description:
        "Configures the muted role. Use --create to create a muted role.",
      detailedDescription: {
        usage: "muterole [flag] [role]",
        examples: ["warningtest"],
        args: ["role : The role to assign as the mute role"],
        flags: [`--create : Creates the muted role`],
      },
      cooldownDelay: 20_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const createRole = args.getFlags("create", "c");
    const role = await args.pick("role").catch(() => undefined);

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (!role) {
      if (createRole) {
        let total;
        const channels = await message.guild.channels
          .fetch()
          .catch(() => undefined);
        if (!channels) return message.reply(`:x: Unable to fetch channels.`);
        total = channels.size;
        const accepted = await require(`../../tools/warningEmbed`).warnMessage(
          message,
          `You're about to create the muted role, which will go through every channel and decline permission to speak in. This will take a few seconds depending on the amount channels. Continue?`,
        );
        if (!accepted) return;
        const msg = await message.reply(
          `<a:load:1253195468830146703> **Role creation started...**`,
        );
        const muteRole = await message.guild.roles
          .create({
            name: `Muted`,
            color: "DarkGrey",
            permissions: [],
            reason: `Creating mute role`,
          })
          .catch((err) => {
            msg.edit(`:x: ${err}`);
            return undefined;
          });
        if (!muteRole) return;
        let index = 0;
        let trueindex = 0;
        let success = 0;
        console.log(`Modifying ${total} channels`);
        channels.forEach(function (channel) {
          index++;
          setTimeout(async function () {
            trueindex++;
            console.log(`Modifying channel ${trueindex}/${total}`);
            await channel.permissionOverwrites
              .create(
                muteRole,
                {
                  SendMessages: false,
                  AddReactions: false,
                  Connect: false,
                  Speak: false,
                },
                "Applying muted role permissions",
              )
              .then(function () {
                console.log(`Success`);
                success++;
              })
              .catch((err) => {
                console.log(`Failed (${err})`);
              });
            if (trueindex == total) {
              db.moderation.muteRole = muteRole.id;
              await db.save();
              msg.edit(
                `:white_check_mark: Successfully created the muted role. Applied perms to ${success}/${total} channels.`,
              );
            }
          }, 1000 * index);
        });
      } else {
        if (!db.moderation.muteRole) {
          return message.reply(`:x: No mute role was set.`);
        }
        return message.reply({
          content: `The current mute role is **${message.guild.roles.cache.get(db.moderation.muteRole) ? message.guild.roles.cache.get(db.moderation.muteRole) : db.moderation.muteRole}**. This will be assigned when Discord timeouts aren't able to be used.`,
          allowedMentions: { parse: [] },
        });
      }
    } else {
      db.moderation.muteRole = role.id;
      await db.save();
      return message.reply(
        `:white_check_mark: Successfully set the mute role to **${role.name}**`,
      );
    }
  }
}
module.exports = {
  PingCommand,
};
