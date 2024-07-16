const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const { Listener, Events } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const config = require("../../config.json");
const {
  EmbedBuilder,
  AttachmentBuilder,
  Colors,
  Permissions,
} = require("discord.js");

const tf = require("@tensorflow/tfjs-node");
const nsfwjs = require("nsfwjs");
tf.enableProdMode();
let model; // Will be loaded later when automod runs.

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      name: "automodnsfw",
      event: Events.MessageCreate,
    });
  }
  async run(message) {
    if (message.author.bot) return;
    if (!isGuildBasedChannel(message.channel)) return;
    if (!message.member) return;
    if (!message.member.id) return;
    if (message.attachments.size == 0) return;

    if (message.channel.nsfw) return;
    if (message.member.permissions.has("KickMembers")) return;
    if (message.member.permissions.has("BanMembers")) return;
    if (message.member.permissions.has("ModerateMembers")) return;
    if (message.member.permissions.has("ManageGuild")) return;

    /* if (this.container.client.id == "1239263616025493504") {
        const hasStaging = await message.guild.members
          .fetch("1227318291475730443")
          .catch(() => undefined);
        if (hasStaging) return;
    }*/

    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    if (db.automod.nsfwimage.length > 0) {
      if (!model)
        model = await nsfwjs.load(`file://./tools/automod/nsfwmodel.json`);

      let wasflagged = false;
      const images = message.attachments
        .filter((a) => a.contentType.startsWith("image"))
        .map((a) => a.url);
      console.log(`Scanning ${images.length} photos for nsfw.`);
      const flaggedImages = [];
      let flagReason = "";
      for (let i = 0; i < images.length; i++) {
        await timeout(i * 250);
        console.log(`Scanning Image ${i}:`);
        const imgfetch = await fetch(images[i]).catch(() => undefined);
        if (!imgfetch) {
          console.log(`Error fetching an image ${images[i]}`);
        } else {
          const imgArray = Buffer.from(await imgfetch.arrayBuffer());
          let img;
          try {
            img = await tf.node.decodeImage(imgArray, 3);
          } catch (e) {
            console.log(`Unsupported image format. Carrying on.`);
          }
          // .catch(() => { return `Unsupported image format. Carrying on.`; });
          if (img) {
            const predictions = await model.classify(img, 1);
            img.dispose();
            switch (predictions[0].className.toLowerCase()) {
              // The bot checked if the image matches nsfw.
              // It'll return the following: porn, hentai, sexy, neutral, drawing
              // Most certain is sent. If it matches the first three, it'll flag
              // the message and execute automod actions set with =nsfw.
              // Seems simple enough I guess. ¯\_(ツ)_/¯
              case "porn":
              case "hentai":
              case "sexy": {
                wasflagged = true;
                flagReason = `${predictions[0].className}, ${(predictions[0].probability * 100).toString().substring(0, 3)}% certain`;
                flaggedImages.push(images[i]);
                console.log(
                  `Dirty! it's ${predictions[0].className} (${(predictions[0].probability * 100).toString().substring(0, 3)}% certain) :) Time to ban ban ban!`,
                );
                break;
              }
              default: {
                console.log(
                  `Clean. it's ${predictions[0].className} (${(predictions[0].probability * 100).toString().substring(0, 3)}% certain)`,
                );
              }
            }
          }
        }
      }

      if (wasflagged == true) {
        let sendMessage = false;
        const executions = db.automod.nsfwimage;
        console.log(`Executing actions`, executions.join(", "));
        if (executions.includes("delete")) {
          setTimeout(() => message.delete().catch(() => undefined), 500);
        }
        if (executions.includes("send")) {
          sendMessage = true;
        }
        if (executions.includes("report")) {
          const embed = new EmbedBuilder()
            .setAuthor({
              name: message.author.tag,
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            })
            .setDescription(
              `Message by ${message.author} was flagged by automod in ${message.channel}.`,
            )
            .setColor(Colors.Orange)
            .addFields([
              {
                name: "Content",
                value: message.content ? message.content : `(None)`,
              },
              {
                name: "Reason",
                value: `Detected an nsfw image ${flagReason}. Flagged images were attached to this message.`,
              },
            ]);

          const reportChannel = await message.guild.channels
            .fetch(db.automod.reportchannel)
            .catch(() => undefined);
          if (reportChannel) {
            const attach = [];
            message.attachments.forEach(function (img) {
              const a = new AttachmentBuilder()
                .setFile(img.attachment)
                .setName(img.name)
                .setSpoiler(true);
              attach.push(a);
            });
            reportChannel.send({
              content: db.automod.pingreport
                ? `<@&${db.automod.pingreport}>`
                : "",
              embeds: [embed],
              files: attach,
            });
          }
        }
        if (executions.includes("ban")) {
          if (!message.member.bannable) return;
          let caseid = 0;
          caseid = db.infractions.length + 1;
          const thecase = {
            id: caseid,
            punishment: "Ban",
            member: message.member.id,
            moderator: this.container.client.user.id,
            reason: `(Automod) Nsfw image detected (${flagReason})`,
            expiretime: 0,
            expired: false,
            hidden: false,
            modlogID: null,
          };

          const embed = new EmbedBuilder()
            .setAuthor({
              name: message.guild.name,
              iconURL: message.guild.iconURL({ dynamic: true }),
            })
            .setTitle(`Your infractions has been updated`)
            .addFields(
              {
                name: `Details:`,
                value: `**ID: \` ${caseid} \` | Type:** ${thecase.punishment} | **Responsible moderator:** ${this.container.client.user}`,
              },
              {
                name: `Reason:`,
                value: `(Automod) Nsfw image detected (${flagReason})`,
              },
            )
            .setColor(Colors.Orange)
            .setTimestamp(new Date());
          message.member.send({ embeds: [embed] }).catch(() => undefined);

          if (db.logging.infractions) {
            const channel = await message.guild.channels
              .fetch(db.logging.infractions)
              .catch(() => undefined);
            if (channel) {
              const embedT = new EmbedBuilder()
                .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
                .setDescription(
                  `**Offender:** ${message.member}\n**Moderator:** ${this.container.client.user}\n**Reason:** ${thecase.reason}`,
                )
                .setColor(Colors.Orange)
                .setFooter({ text: `ID ${message.member.id}` })
                .setTimestamp(new Date());
              const msg = await channel
                .send({
                  // content: '',
                  embeds: [embedT],
                })
                .catch((err) => {
                  console.error(`[error] Error on sending to channel`, err);
                  return undefined;
                });
              if (msg) thecase.modlogID = msg.id;
            }
          }
          await message.member.ban({
            deleteMessageSeconds: 0,
            reason: thecase.reason,
          });
          db.infractions.push(thecase);
          await db.save().catch(() => undefined);
          if (sendMessage == true)
            return message.channel(
              `:white_check_mark: ${message.author} was **banned** with case id **\` ${caseid} \`**.\n**Reason:** (Automod) Nsfw image detected (${flagReason}).`,
            );
        } else if (executions.includes("kick")) {
          if (!message.member.kickable) return;
          let caseid = 0;
          caseid = db.infractions.length + 1;
          const thecase = {
            id: caseid,
            punishment: "Kick",
            member: message.member.id,
            moderator: this.container.client.user.id,
            reason: `(Automod) Nsfw image detected (${flagReason})`,
            expiretime: 0,
            expired: false,
            hidden: false,
            modlogID: null,
          };

          const embed = new EmbedBuilder()
            .setAuthor({
              name: message.guild.name,
              iconURL: message.guild.iconURL({ dynamic: true }),
            })
            .setTitle(`Your infractions has been updated`)
            .addFields(
              {
                name: `Details:`,
                value: `**ID: \` ${caseid} \` | Type:** ${thecase.punishment} | **Responsible moderator:** ${this.container.client.user}`,
              },
              {
                name: `Reason:`,
                value: `(Automod) Nsfw image detected (${flagReason})`,
              },
            )
            .setColor(Colors.Orange)
            .setTimestamp(new Date());
          message.member.send({ embeds: [embed] }).catch(() => undefined);

          if (db.logging.infractions) {
            const channel = await message.guild.channels
              .fetch(db.logging.infractions)
              .catch(() => undefined);
            if (channel) {
              const embedT = new EmbedBuilder()
                .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
                .setDescription(
                  `**Offender:** ${message.member}\n**Moderator:** ${this.container.client.user}\n**Reason:** ${thecase.reason}`,
                )
                .setColor(Colors.Orange)
                .setFooter({ text: `ID ${message.member.id}` })
                .setTimestamp(new Date());
              const msg = await channel
                .send({
                  // content: '',
                  embeds: [embedT],
                })
                .catch((err) => {
                  console.error(`[error] Error on sending to channel`, err);
                  return undefined;
                });
              if (msg) thecase.modlogID = msg.id;
            }
          }
          await message.member.kick(thecase.reason);
          db.infractions.push(thecase);
          await db.save().catch(() => undefined);
          if (sendMessage == true)
            return message.channel.send(
              `:white_check_mark: ${message.author} was **kicked** with case id **\` ${caseid} \`**.\n**Reason:** (Automod) Nsfw image detected (${flagReason}).`,
            );
        } else if (executions.includes("mute")) {
          if (!message.member.moderatable) return;
          let caseid = 0;
          const duration = require("ms")(
            db.automod.muteduration ? db.automod.muteduration : "20m",
            { long: true },
          );
          caseid = db.infractions.length + 1;
          const thecase = {
            id: caseid,
            punishment: "Mute",
            member: message.member.id,
            moderator: this.container.client.user.id,
            reason: `(Automod) Nsfw image detected (${flagReason})`,
            expiretime: 0,
            expired: false,
            hidden: false,
            modlogID: null,
          };

          const embed = new EmbedBuilder()
            .setAuthor({
              name: message.guild.name,
              iconURL: message.guild.iconURL({ dynamic: true }),
            })
            .setTitle(`Your infractions has been updated`)
            .addFields(
              {
                name: `Details:`,
                value: `**ID: \` ${caseid} \` | Type:** ${thecase.punishment} | **Duration:** ${require("ms")(duration, { long: true })} | **Responsible moderator:** ${this.container.client.user}`,
              },
              {
                name: `Reason:`,
                value: `(Automod) Nsfw image detected (${flagReason})`,
              },
            )
            .setColor(Colors.Orange)
            .setTimestamp(new Date());
          message.member.send({ embeds: [embed] }).catch(() => undefined);

          if (db.logging.infractions) {
            const channel = await message.guild.channels
              .fetch(db.logging.infractions)
              .catch(() => undefined);
            if (channel) {
              const embedT = new EmbedBuilder()
                .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
                .setDescription(
                  `**Offender:** ${message.member}\n**Moderator:** ${this.container.client.user}\n**Duration:** ${require("ms")(duration, { long: true })}\n**Reason:** ${thecase.reason}`,
                )
                .setColor(Colors.Orange)
                .setFooter({ text: `ID ${message.member.id}` })
                .setTimestamp(new Date());
              const msg = await channel
                .send({
                  // content: '',
                  embeds: [embedT],
                })
                .catch((err) => {
                  console.error(`[error] Error on sending to channel`, err);
                  return undefined;
                });
              if (msg) thecase.modlogID = msg.id;
            }
          }
          await message.member.disableCommunicationUntil(
            Date.now() + duration,
            thecase.reason,
          );
          db.infractions.push(thecase);
          await db.save().catch(() => undefined);
          if (sendMessage == true)
            return message.channel.send(
              `:white_check_mark: ${message.author} was **muted** for **${require("ms")(duration, { long: true })}** with case id **\` ${caseid} \`**.\n**Reason:** (Automod) Nsfw image detected (${flagReason}).`,
            );
        } else if (executions.includes("warn")) {
          let caseid = 0;
          caseid = db.infractions.length + 1;
          const thecase = {
            id: caseid,
            punishment: "Warn",
            member: message.member.id,
            moderator: this.container.client.user.id,
            reason: `(Automod) Nsfw image detected (${flagReason})`,
            expiretime: 0,
            expired: false,
            hidden: false,
            modlogID: null,
          };

          const embed = new EmbedBuilder()
            .setAuthor({
              name: message.guild.name,
              iconURL: message.guild.iconURL({ dynamic: true }),
            })
            .setTitle(`Your infractions has been updated`)
            .addFields(
              {
                name: `Details:`,
                value: `**ID: \` ${caseid} \` | Type:** ${thecase.punishment} | **Responsible moderator:** ${this.container.client.user}`,
              },
              {
                name: `Reason:`,
                value: `(Automod) Nsfw image detected (${flagReason})`,
              },
            )
            .setColor(Colors.Orange)
            .setTimestamp(new Date());
          message.member.send({ embeds: [embed] }).catch(() => undefined);

          if (db.logging.infractions) {
            const channel = await message.guild.channels
              .fetch(db.logging.infractions)
              .catch(() => undefined);
            if (channel) {
              const embedT = new EmbedBuilder()
                .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
                .setDescription(
                  `**Offender:** ${message.member}\n**Moderator:** ${this.container.client.user}\n**Reason:** ${thecase.reason}`,
                )
                .setColor(Colors.Orange)
                .setFooter({ text: `ID ${message.member.id}` })
                .setTimestamp(new Date());
              const msg = await channel
                .send({
                  // content: '',
                  embeds: [embedT],
                })
                .catch((err) => {
                  console.error(`[error] Error on sending to channel`, err);
                  return undefined;
                });
              if (msg) thecase.modlogID = msg.id;
            }
          }
          db.infractions.push(thecase);
          await db.save().catch(() => undefined);
          if (sendMessage == true)
            return message.channel.send(
              `:white_check_mark: ${message.author} was **warned** with case id **\` ${caseid} \`**.\n**Reason:** (Automod) Nsfw image detected (${flagReason}).`,
            );
        } else if (sendMessage == true)
          return message.channel.send(
            `:warning: ${message.author} Don't send nsfw images.`,
          );
      }
    }
  }
}
module.exports = {
  ReadyListener,
};
