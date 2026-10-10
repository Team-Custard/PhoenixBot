const { ApplicationIntegrationType, InteractionContextType } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const search = require("youtube-search");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

const queryArg = { name: "query", type: "string", required: true, rest: true, maxLength: 200, description: "The search query" };

class YoutubeCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "youtube",
      aliases: ["yt"],
      description: "Searches YouTube for a video or channel.",
      examples: ["youtube never gonna give you up", "youtube channel sylveondev"],
      subcommands: [
        { name: "video", description: "Searches YouTube for a video", args: [queryArg], run: "searchVideo", default: true },
        { name: "channel", description: "Searches YouTube for a channel", args: [queryArg], run: "searchChannel" },
      ],
      slash: {
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
      },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      preconditions: ["module"],
    });
  }

  searchVideo(ctx, { query }) {
    return this.search(ctx, query, "video");
  }

  searchChannel(ctx, { query }) {
    return this.search(ctx, query, "channel");
  }

  async search(ctx, query, type) {
    await ctx.defer();
    const results = await new Promise((resolve) => {
      search(query, { maxResults: 1, key: process.env.googlekey, type }, (err, found) => resolve(err ? null : found));
    });
    if (!results?.length) return ctx.reply(`${emoji("error")} Not found.`);
    return ctx.reply(results[0].link);
  }
}

module.exports = { YoutubeCommand };
