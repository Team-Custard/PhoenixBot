const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const { buildMessage, contextFrom } = require("../../tools/placeholders");
const premiumCheck = require("../../tools/premiumCheck");
const builtInTags = require("../../tools/infoStuff.json");

const { LIMITS } = require("../../tools/limits");

const FREE_LIMIT = LIMITS.tags.free;
const MAX_LIMIT = LIMITS.tags.premium;
const nameArg = (description, autocomplete = true) => ({ name: "name", type: "string", required: true, maxLength: 12, autocomplete, description });

class TagsCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "tags",
      aliases: ["t", "tag"],
      description: "Shows and manages server tags. Placeholders like {{mention}} work in tags, and tags can have embeds (set on the dashboard).",
      examples: ["tag list", "tag breezip", "tag add sylveon I like Sylveons"],
      subcommands: [
        { name: "display", description: "Displays a tag", args: [nameArg("The name of the tag")], run: "display", default: true },
        { name: "list", description: "Lists all tags in the server", run: "list" },
        {
          name: "add",
          description: "Adds a tag to the server",
          run: "add",
          args: [
            nameArg("The name of the tag (12 characters max)", false),
            { name: "description", type: "string", required: true, rest: true, maxLength: 2048, description: "What the tag says (2048 characters max)" },
          ],
        },
        { name: "remove", description: "Removes a tag from the server", args: [nameArg("The name of the tag")], run: "remove" },
        { name: "info", description: "Shows who made a tag and its raw text", args: [nameArg("The name of the tag")], run: "info" },
      ],
      slash: { name: "tag" },
      cooldownDelay: 15_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  find(settings, name) {
    const lower = name.toLowerCase();
    const custom = settings.tags.find((t) => t.name?.toLowerCase() === lower);
    if (custom) return { tag: custom, builtIn: false };
    const builtIn = builtInTags.find((t) => t.name.toLowerCase() === lower);
    return builtIn ? { tag: builtIn, builtIn: true } : null;
  }

  /** Tag management can be locked to server managers on the dashboard. */
  lockedFor(ctx, settings) {
    return settings.lockTags && !ctx.member.permissions.has(PermissionFlagsBits.ManageGuild);
  }

  async display(ctx, { name }) {
    const settings = await getSettings(ctx.guild.id);
    const found = this.find(settings, name);
    if (!found) return ctx.error(`${emoji("error")} Tag not found.`);
    // Tags can have a saved embed attached on the dashboard; placeholders work in both.
    const message = buildMessage(settings, { content: found.tag.description, embed: found.tag.embed }, contextFrom({ member: ctx.member, channel: ctx.channel }));
    if (!message) return ctx.error(`${emoji("error")} This tag is empty. Its embed may have been deleted.`);
    return ctx.reply(message);
  }

  async list(ctx) {
    const settings = await getSettings(ctx.guild.id);
    const custom = settings.tags.map((t) => `\`${t.name}\``).join(", ");
    return ctx.reply(
      `The following tags are available.${settings.lockTags ? " Tags in this server can only be managed by a server manager." : ""}\n\n` +
      `**Built-in:** ${builtInTags.map((t) => `\`${t.name}\``).join(", ")}\n**Server tags:** ${custom || "No tags created."}`.slice(0, 1900),
    );
  }

  async add(ctx, { name, description }) {
    const settings = await getSettings(ctx.guild.id);
    if (this.lockedFor(ctx, settings)) return ctx.error(`${emoji("error")} Tag management is locked for members.`);
    if (this.find(settings, name)) return ctx.error(`${emoji("error")} Tag already exists.`);
    if (name.length > 12) return ctx.error(`${emoji("error")} Tag name is too long.`);
    if (settings.tags.length >= MAX_LIMIT) return ctx.error(`${emoji("error")} You've reached the maximum of ${MAX_LIMIT} tags.`);
    if (settings.tags.length >= FREE_LIMIT && !(await premiumCheck(ctx.guild))) {
      return ctx.error(`${emoji("error")} You've reached the maximum of ${FREE_LIMIT} tags. Upgrade with Plus for more.`);
    }

    settings.tags.push({ name, description, creator: ctx.user.username });
    await settings.save();
    return ctx.reply(`${emoji("success")} Successfully added tag \`${name}\`.`);
  }

  async remove(ctx, { name }) {
    const settings = await getSettings(ctx.guild.id);
    if (this.lockedFor(ctx, settings)) return ctx.error(`${emoji("error")} Tag management is locked for members.`);
    const tag = settings.tags.find((t) => t.name?.toLowerCase() === name.toLowerCase());
    if (!tag) return ctx.error(`${emoji("error")} Tag does not exist.`);
    settings.tags.pull(tag);
    await settings.save();
    return ctx.reply(`${emoji("success")} Successfully removed tag \`${tag.name}\`.`);
  }

  async info(ctx, { name }) {
    const settings = await getSettings(ctx.guild.id);
    const found = this.find(settings, name);
    if (!found) return ctx.error(`${emoji("error")} Tag not found.`);
    return ctx.reply({
      content: `**${found.tag.name}** : Created by ${found.tag.creator}${found.builtIn ? " : Built-in tag" : ""}${found.tag.embed ? ` : Embed \`${found.tag.embed}\`` : ""}\nContent: \`\`\`${found.tag.description || " "}\`\`\``.slice(0, 2000),
      allowedMentions: { parse: [] },
    });
  }
}

module.exports = { TagsCommand };
