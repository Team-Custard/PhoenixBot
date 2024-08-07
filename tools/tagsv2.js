const { container, Args } = require("@sapphire/framework");
const { Embed, EmbedBuilder, GuildMember, Message, Colors, AttachmentBuilder } = require("discord.js");
const wait = require("timers/promises");

/**
 * Parses {{text}} into readable stuff.
 * @param {string | undefined} text The text to parse
 * @param {GuildMember} member The member, used for most parsings.
 * @param {string | undefined} args Message arguments.
 * @returns The parsed text
 */
const parse = async (text, member, args) => {
    if (!text) return;
    const parsed = await text.replace(/\{\{(.*?)\}\}/g, function (match, token) {     
      const command = token.trim().split(';')
      switch (command[0]) {
        case "mention": {
          return `${member}`;
        }
        case "username": {
          return `${member.user.username}`;
        }
        case "userid": {
          return `${member.user.id}`;
        }
        case "userav": {
          return `${member.user.displayAvatarURL({dynamic: true, size: 4096})}`
        }
        case "membercount": {
          return `${member.guild.memberCount}`;
        }
        case "servername": {
          return `${member.guild.name}`;
        }
        case "getarg": {
          return `${args[command[1]]}`;
        }
        case "restarg": {
          return `${args.join(" ")}`;
        }
        default: {
          return match;
        }
      }
    });
    console.log(parsed);
    return parsed;
};

/**
 * PheonixBot custom command handling. Executes a custom command defined in ==cc.
 * @param {string} commands
 * @param {Message} message 
 * @param {Args} fullarg
 * @param {string} context
 */
exports.exec = async (commands, message, fullarg, context) => {
    const args = await fullarg.rest("string").catch(() => ["none"]);
    if (!args) return;
    let options = {
        nsfw: false,
        silent: false,
        permissions: null,
        dmResponse: null,
        responseChannel: null,
        broken: false
    }
    let embeds = [];
    let images = [];
    let ind = 0;
    const parsed = await commands.replace(/\$\[\[(.*?)\]\]/sg, async function (match, token) {
      try {
        ind++;
        console.log(`execute ${match}`);
        const uncleanedcommand = token.trim().split('|')
        const command = [];
        for (let i = 0; i < uncleanedcommand.length; i++) {
          if (uncleanedcommand[i].indexOf("\n") == 0) command.push(uncleanedcommand[i].substring(1));
          else command.push(uncleanedcommand[i]);
        }
        await wait.setTimeout(ind*1000);
        if (options.broken == true) return;
        switch(command[0]) {
          case 'send': {
            await message.reply({
              content: (command[1] ? await parse(command[1], message.member, args) : ""),
              embeds: (embeds.length > 0 ? embeds : []),
              files: (images.length > 0 ? images : [])
            })
              .catch((err) => console.error(`CC message failed to send`, err));
            embeds = [];
            break;
          }
          case 'embed': {
              const embed = new EmbedBuilder()
              .setColor(Colors.Orange);
              if (command[1] != "none" && command[1] != null) {
                  const authorField = command[1].split('~')
                  embed.setAuthor({name: await parse(authorField[0], message.member, args) || null, iconURL: await parse(authorField[1], message.member, args) || null})
              }
              if (command[2] != "none" && command[2] != null) {
                  const titleField = command[2].split('~')
                  embed.setTitle(await parse(titleField[0], message.member, args) || null)
                  .setURL(await parse(titleField[1], message.member, args) || null)
              }
              if (command[3] != "none" && command[3] != null) {
                  embed.setDescription(await parse(command[3], message.member, args) || null)
              }
              if (command[4] != "none" && command[4] != null) {
                const fields = command[4].split('~')
                if (fields.length > 4) fields.splice(5, fields.length - 4);
                for (let i = 0; i < fields.length; i++) {
                  const fieldVal = fields[i].split(';;');
                  embed.addFields({
                    name: (await parse(fieldVal[0], message.member, args) || "none"), value: (await parse(fieldVal[1], message.member, args) || "none"), inline: (/true/).test(fieldVal[2])
                  })
                }
              }
              if (command[5] != "none" && command[5] != null) {
                const authorField = command[1].split('~')
                embed.setFooter({text: await parse(authorField[0], message.member, args) || null, iconURL: await parse(authorField[1], message.member, args) || null})
              }
              if (command[6] != "none" && command[6] != null) {
                const imageField = command[1].split('~')
                embed.setThumbnail(await parse(imageField[0], message.member, args) || null)
                .setImage(await parse(imageField[1], message.member, args) || null);
              }
              if (command[7] == "true" && command[7] != null) {
                embed.setTimestamp(new Date());
              }
              embeds.push(embed);
              break;
          }
          case 'exec': {
              const cmd = container.stores.get('commands').get(command[1])
              if (!cmd)
                  if (!options.silent)
                      return message.reply(`${this.container.emojis.error} Command not found \`${command[1]}\`.`)
                  else return;
              const contexto = { commandName: command[1] };
              const argso = await cmd.messagePreParse(message, (command[2] ? parse(command[2], message, member, args) : ""), contexto);
              cmd.messageRun(message, argso, contexto);
              break;
          }
          /* case 'fetchimg': {
            if (!command[1]) break;
            const res = await fetch(command[1]).catch(message.reply(`${this.container.emojis.error} Failed to fetch image.`));
            if (!res) {
              options.broken = true;
              break;
            }
            const body = Buffer.from(await res.arrayBuffer());
            const attachment = new AttachmentBuilder()
            .setFile(body)
            .setName(`fetchedImg.webp`)
            .setDescription(`A fetched image by Phoenix custom commands.`)
            .toJSON()

            images.push(attachment);
            break;
          } */
          case 'silent': {
              options.silent = true;
              break;
          }
          case 'nsfw': {
              options.nsfw = true;
              if (!message.channel.nsfw)
                  options.broken = true;
                  if (!options.silent)
                      return message.reply(`${this.container.emojis.error} This command can only be used in nsfw channels.`);
                  else return;
          }
        }
      }
      catch (err) {
        console.error(`Recieved error running a custom command`, err);
        message.reply(`${this.container.emojis.error} ${err}`);
      }
    });
};