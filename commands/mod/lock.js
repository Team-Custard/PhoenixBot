const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "lock",
      aliases: [`lockdown`],
      description: "Locks a channel.",
      detailedDescription: {
        usage: "lock [flags]",
        examples: ["lock", "lock --end"],
        flags: [
          `--all : Locks all the defined lockdown channels.`,
          `--end : Unlocks the channel.`,
          `--endall : Unlocks all the channels.`,
        ],
      },
      cooldownDelay: 60_000,
      requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
      requiredClientPermissions: [PermissionFlagsBits.ManageChannels],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const all = args.getFlags("all", "a");
    const end = args.getFlags("end", "e");
    const endAll = args.getFlags("endall", "ea");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (all) {
      const accepted = await require(`../../tools/warningEmbed`).warnMessage(
        message,
        `You're about to initiate a mass lockdown. This may take a while depending on how many channels are assigned to be locked. Continue?`,
      );
      if (!accepted) return;
      const msg = await message.reply(
        `<a:load:1253195468830146703> **Lockdown started...**`,
      );
      let index = 0;
      let trueindex = 0;
      let success = 0;
      const channels = [];
      const fetchedChannels = await message.guild.channels.fetch();
      for (let i = 0; i < fetchedChannels.size; i++) {
        if (db.moderation.lockdownChannels.includes(fetchedChannels.at(i).id)) {
          channels.push(fetchedChannels.at(i));
        }
      }
      const total = channels.length;
      console.log(`Modifying ${total} channels`);
      if (total == 0)
        return message.reply(
          `:x: No channels were set to lock. Use \`lockchannels\` to set them.`,
        );
      channels.forEach(function (channel) {
        index++;
        setTimeout(async function () {
          trueindex++;
          console.log(`Modifying channel ${trueindex}/${total}`);
          await channel.permissionOverwrites
            .edit(
              message.guild.roles.everyone,
              {
                SendMessages: false,
                AddReactions: false,
                Connect: false,
                Speak: false,
              },
              `(Lockdown by ${message.author.tag})`,
            )
            .then(function () {
              console.log(`Success`);
              success++;
            })
            .catch((err) => {
              console.log(`Failed (${err})`);
            });
          if (trueindex == total) {
            msg.edit(
              `:white_check_mark: Successfully locked ${success}/${total} channels.`,
            );
          }
        }, 1000 * index);
      });
    } else if (endAll) {
      const msg = await message.reply(
        `<a:load:1253195468830146703> **Unlock started...**`,
      );
      let index = 0;
      let trueindex = 0;
      let success = 0;
      const channels = [];
      const fetchedChannels = await message.guild.channels.fetch();
      for (let i = 0; i < fetchedChannels.size; i++) {
        if (db.moderation.lockdownChannels.includes(fetchedChannels.at(i).id)) {
          channels.push(fetchedChannels.at(i));
        }
      }
      const total = channels.length;
      console.log(`Modifying ${total} channels`);
      if (total == 0)
        return message.reply(
          `:x: No channels were set to lock. Use \`lockchannels\` to set them.`,
        );
      channels.forEach(function (channel) {
        index++;
        setTimeout(async function () {
          trueindex++;
          console.log(`Modifying channel ${trueindex}/${total}`);
          await channel.permissionOverwrites
            .edit(
              message.guild.roles.everyone,
              {
                SendMessages: null,
                AddReactions: null,
                Connect: null,
                Speak: null,
              },
              `(Unlock by ${message.author.tag})`,
            )
            .then(function () {
              console.log(`Success`);
              success++;
            })
            .catch((err) => {
              console.log(`Failed (${err})`);
            });
          if (trueindex == total) {
            msg.edit(
              `:white_check_mark: Successfully unlocked ${success}/${total} channels.`,
            );
          }
        }, 1000 * index);
      });
    } else if (end) {
      await message.channel.permissionOverwrites
        .edit(
          message.guild.roles.everyone,
          {
            SendMessages: null,
            AddReactions: null,
            Connect: null,
            Speak: null,
          },
          `(Unlock by ${message.author.tag})`,
        )
        .then(function () {
          message.reply(
            `:white_check_mark: Successfully unlocked ${message.channel}.`,
          );
        })
        .catch((err) => {
          message.reply(`:x: ${err}`);
        });
    } else {
      await message.channel.permissionOverwrites
        .edit(
          message.guild.roles.everyone,
          {
            SendMessages: false,
            AddReactions: false,
            Connect: false,
            Speak: false,
          },
          `(Locked by ${message.author.tag})`,
        )
        .then(function () {
          message.reply(
            `:white_check_mark: Successfully locked ${message.channel}.`,
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
