const { Command, Args, container } = require("@sapphire/framework");
const { Colors, PermissionFlagsBits, Message } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "shadowbanrole",
      aliases: ["sbanrole"],
      description:
        "Configures the shadowbanned role. Use --create to setup shadowbanning.",
      detailedDescription: {
        usage: "shadowbanrole [flag] [role]",
        examples: ["shadowbanrole @shadowbanned", `shadowbanrole --create`],
        args: ["role : The role to assign as the shadowbanned role"],
        flags: [`--create : Creates the shadowbanned role and channel`],
      },
      cooldownDelay: 20_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      flags: true,
    });
  }

  /**
   * @param {Message} message
   * @param {Args} args
   */
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
        if (!channels) return message.reply(`${this.container.emojis.error} Unable to fetch channels.`);
        total = channels.size;
        const accepted = await require(`../../tools/warningEmbed`).warnMessage(
          message,
          `You're about to create the shadowbanned role, which will go through every channel and remove permission to view for shadowbanned users, and then it'll create a shadowbanned channel. This will take a few seconds depending on the amount channels. Continue?`,
        );
        if (!accepted) return;
        const msg = await message.reply(
          `${this.container.emojis.loading} **Role creation started...**`,
        );
        const muteRole = await message.guild.roles
          .create({
            name: `Banished`,
            color: Colors.DarkButNotBlack,
            permissions: [],
            reason: `Creating shadowbanned role`,
          })
          .catch((err) => {
            msg.edit(`${this.container.emojis.error} ${err}`);
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
                  ViewChannel: false,
                  SendMessages: false,
                },
                "Applying shadowbanned role permissions",
              )
              .then(function () {
                console.log(`Success`);
                success++;
              })
              .catch((err) => {
                console.log(`Failed (${err})`);
              });
            if (trueindex == total) {
              const shadowbannedchannel = await message.guild.channels.create({
                name: `shadowbanned`,
                parent: null,
                permissionOverwrites: [{
                    id: muteRole.id,
                    allow: ["ViewChannel"],
                    deny: ["AddReactions", "AttachFiles", "EmbedLinks", "CreatePublicThreads", "CreatePrivateThreads", "CreateInstantInvite"],
                }, {
                    id: message.guild.roles.everyone.id,
                    deny: ["ViewChannel"]
                }],
                reason: `Creating shadowbanned channel`
              })
              .then((c) => {
                c.send({ embeds: [
                    {
                        title: `${container.emojis.warning} You've been shadowbanned!`,
                        description: `When you are shadowbanned, every channel gets hidden, and you can only see this channel.`,
                        color: Colors.Orange
                    }
                ] }
                ).then((m) => m.pin());
              });
              db.moderation.shadowBannedRole = muteRole.id;
              await db.save();
              msg.edit(
                `${container.emojis?.success} Successfully setup shadowbanning. Applied perms to ${success}/${total} channels and created the ${shadowbannedchannel} channel.`,
              );
            }
          }, 1000 * index);
        });
      } else {
        if (!db.moderation.shadowBannedRole) {
          return message.reply(`${this.container.emojis.error} No shadowbanned role was set.`);
        }
        return message.reply({
          content: `The current shadowbanned role is **${message.guild.roles.cache.get(db.moderation.muteRole) ? message.guild.roles.cache.get(db.moderation.muteRole) : db.moderation.muteRole}**. This will be assigned when Discord timeouts aren't able to be used.`,
          allowedMentions: { parse: [] },
        });
      }
    } else {
      db.moderation.shadowBannedRole = role.id;
      await db.save();
      return message.reply(
        `${this.container.emojis.success} Successfully set the shadowbanned role to **${role.name}**`,
      );
    }
  }
}
module.exports = {
  PingCommand,
};
