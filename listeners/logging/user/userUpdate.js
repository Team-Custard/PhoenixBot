const { Listener } = require("@sapphire/framework");
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, logChannelId } = require("../../../tools/logging");

async function download(url, name) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    return new AttachmentBuilder(Buffer.from(await response.arrayBuffer()), { name });
  }
  catch {
    return null;
  }
}

const extension = (url) => (url.split("?")[0].split(".").pop() || "png");

// Username and avatar changes, logged in every server (on this cluster) that the
// user is in and that has user logs turned on.
class LoggerUserUpdate extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "userUpdate", name: "loggerUserUpdate" });
  }

  async run(oldUser, user) {
    if (oldUser.partial) return;
    const renamed = oldUser.username !== user.username;
    const newAvatar = oldUser.avatar !== user.avatar;
    if (!renamed && !newAvatar) return;

    // The old version looped over guilds forever (`for (i = 0; guilds.size; i++)`).
    const guilds = this.container.client.guilds.cache.filter((g) => g.members.cache.has(user.id));
    const targets = [];
    for (const guild of guilds.values()) {
      const settings = await peekSettings(guild.id);
      if (logChannelId(settings, "users")) targets.push({ guild, settings });
    }
    if (targets.length === 0) return;

    const embeds = [];
    const components = [];
    let files = [];

    if (renamed) {
      embeds.push(logEmbed(user, `${user} updated their username.\n**Old username:** ${oldUser.username}\n**New username:** ${user.username}`));
    }

    if (newAvatar) {
      // Downloaded once and re-uploaded, because the old avatar URL stops working.
      const oldFile = oldUser.avatar ? await download(oldUser.displayAvatarURL({ size: 1024 }), `oldavatar.${extension(oldUser.displayAvatarURL())}`) : null;
      const newFile = user.avatar ? await download(user.displayAvatarURL({ size: 1024 }), `newavatar.${extension(user.displayAvatarURL())}`) : null;
      files = [oldFile, newFile].filter(Boolean);

      const url = user.displayAvatarURL({ size: 1024 });
      const main = logEmbed(user, `${user} Avatar update!`).setURL(url);
      if (newFile) main.setThumbnail(`attachment://${newFile.name}`);
      // The extra embeds share the URL so Discord groups them; the buttons read them back.
      const oldEmbed = new EmbedBuilder().setURL(url);
      const newEmbed = new EmbedBuilder().setURL(url);
      if (oldFile) oldEmbed.setThumbnail(`attachment://${oldFile.name}`);
      if (newFile) newEmbed.setThumbnail(`attachment://${newFile.name}`);
      embeds.push(main, oldEmbed, newEmbed);
      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("displayAvatar-OLD").setLabel("Old avatar").setStyle(ButtonStyle.Secondary).setDisabled(!oldFile),
          new ButtonBuilder().setCustomId("displayAvatar-NEW").setLabel("New avatar").setStyle(ButtonStyle.Secondary).setDisabled(!newFile),
        ),
      );
    }

    for (const { guild, settings } of targets) {
      await sendLog(guild, "users", { embeds, files, components }, settings);
    }
  }
}

module.exports = { LoggerUserUpdate };
