const {
  EmbedBuilder,
  Colors,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { createSlashGroup } = require("../../tools/SlashGroup");
const { emoji } = require("../../tools/errorReporter");
const { dashboard } = require("../../tools/config");
const { commandMention } = require("../../tools/CommandContext");
const UserDB = require("../../tools/UserDB");

// /userdb: personal settings that follow you across servers. Members (timefor,
// pronouns, afk) come from their own command files; set/display/clear live here.
const UserdbGroup = createSlashGroup({
  name: "userdb",
  description: "Your UserDB profile",
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  subcommands: [
    {
      name: "set",
      description: "Set up or change your UserDB profile on the website",
      run: async (ctx) => {
        // UserDB is set up on the website now: time zone detection, every field, and
        // a button to delete your data.
        const url = `${dashboard.baseUrl}/userdb`;
        const components = url.startsWith("https://")
          ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open UserDB settings").setURL(url))]
          : [];
        return ctx.reply({
          content: `${emoji("info")} Set up your UserDB profile on the website: ${url}
It detects your time zone, and you can change or delete everything there.`,
          components,
          ephemeral: true,
        });
      },
    },
    {
      name: "display",
      description: "Shows someone's UserDB profile",
      args: [{ name: "user", type: "user", description: "Whose profile to show (defaults to you)" }],
      run: async (ctx, { user }) => {
        user = user ?? ctx.user;
        if (user.bot) return ctx.error(`${emoji("error")} Bots can't be added to UserDB.`);
        const prefs = await UserDB.findById(user.id).lean().cacheQuery();
        const embed = new EmbedBuilder()
          .setTitle(user.username)
          .setColor(Colors.Orange)
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp(new Date());
        if (!prefs) {
          embed.setDescription(`**ID:** ${user.id}\n**UserDB registered:** ${emoji("error")} No, use ${commandMention("userdb set")}.`);
        }
        else {
          const socials = prefs.socials ?? {};
          embed.setDescription([
            `**ID:** ${user.id}`,
            `**UserDB registered:** ${emoji("success")} Yes`,
            "",
            "__**UserDB info:**__",
            `**Timezone:** ${prefs.timezone || "Unset"}`,
            `**Pronouns:** ${prefs.pronouns || "Unset"}`,
            `**Description:** ${prefs.description || "Unset"}`,
            "",
            "__**Socials:**__",
            `**Youtube:** ${socials.youtube ? `[${socials.youtube}](https://youtube.com/${socials.youtube})` : "Unset"}`,
            `**Twitter:** ${socials.twitter ? `[${socials.twitter}](https://twitter.com/${socials.twitter})` : "Unset"}`,
          ].join("\n"));
        }
        return ctx.reply({ embeds: [embed] });
      },
    },
    {
      name: "clear",
      description: "Deletes your UserDB profile (also possible on the website)",
      run: async (ctx) => {
        const doc = await UserDB.findById(ctx.user.id);
        if (doc) await doc.deleteOne();
        return ctx.reply(`${emoji("success")} Deleted your UserDB configuration successfully.`);
      },
    },
  ],
});

module.exports = { UserdbGroup };
