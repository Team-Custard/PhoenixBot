const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const bent = require("bent");
const fetch = require("node-fetch");
const { getPost } = require('../../tools/redditUtils');
const { AttachmentBuilder, ApplicationIntegrationType, InteractionContextType, EmbedBuilder, Colors, ChatInputCommandInteraction } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "utilities",
      subcommands: [
        {
          name: "cat",
          chatInputRun: "chatInputCat",
        },
        {
          name: "dog",
          chatInputRun: "chatInputDog",
        },
        {
          name: "kitten",
          chatInputRun: "chatInputKitten",
        },
        {
          name: "meme",
          chatInputRun: "chatInputMeme",
        },
        {
          name: "reddit",
          chatInputRun: "chatInputReddit",
        },
        {
          name: "wolfram",
          chatInputRun: "chatInputWolfram",
        },
        {
          name: "phoenixav",
          chatInputRun: "chatInputPhoenixAV",
        },
        {
          name: "avatar",
          chatInputRun: "chatInputAvatar",
        },
        {
          name: "icon",
          chatInputRun: "chatInputIcon",
        },
        {
          name: "serverbanner",
          chatInputRun: "chatInputServerBanner",
        },
        {
          name: "rav",
          chatInputRun: "chatInputRav",
        },
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("utilities")
        .setDescription("Utility commands")
        .addSubcommand((command) =>
          command.setName("cat").setDescription("Sends a random cat"),
        )
        .addSubcommand((command) =>
          command.setName("dog").setDescription("Sends a random dog"),
        )
        .addSubcommand((command) =>
          command
            .setName("kitten")
            .setDescription("Sends a random baby cat owo"),
        )
        .addSubcommand((command) =>
          command
            .setName("meme")
            .setDescription("Sends a random meme from reddit"),
        )
        .addSubcommand((command) =>
          command
            .setName("reddit")
            .setDescription("Gets a post from Reddit")
            .addStringOption((option) =>
              option
                .setName("subreddit")
                .setDescription("The subreddit to use")
                .setRequired(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("wolfram")
            .setDescription("Solves your problem with wolfram|alpha")
            .addStringOption((option) =>
              option
                .setName("query")
                .setDescription("The query to look up")
                .setRequired(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("phoenixav")
            .setDescription("Turns you into Pheonix")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("avatar")
            .setDescription("Displays a member's avatar")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user")
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option
                .setName("server")
                .setDescription("Displays the user's server avatar if enabled")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("icon")
            .setDescription("Display the server's icon"),
        )
        .addSubcommand((command) =>
          command
            .setName("serverbanner")
            .setDescription("Display the server's banner"),
        )
        .addSubcommand((command) =>
          command
            .setName("rav")
            .setDescription("Searches for a user's avatar with Google")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user")
                .setRequired(true),
            ),
        )
        .setDMPermission(true)
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
        .setContexts([InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel]),
    );
  }

  async chatInputReddit(interaction) {
      await interaction.deferReply();
      let sub = await interaction.options.getString('subreddit');
      sub = sub.replace('r/', '');
      const post = await getPost(sub);
  
      if (!post) return interaction.followUp(`${this.container.emojis.error} No post found.`)
  
      if (post.over_18 && !interaction.channel?.nsfw) return interaction.followUp(`${this.container.emojis.warning} The fetched post was marked as nsfw, thus I will not send it here.`);
  
      const embed = new EmbedBuilder()
      .setTitle(post.title+(post.archived ? ' 🔒':''))
      .setURL(`https://reddit.com${post.permalink}`)
      .setFields([
          { name: 'Author', value: `[u/${post.author}](https://reddit.com/u/${post.author})`, inline: true },
          { name: 'Upvotes', value: `⬆️ ${post.ups} ⬇️ ${post.downs}`, inline: true }
      ])
      .setDescription(post.selftext.substring(0,2000) || `(No description)`)
      .setColor(Colors.Orange)
      .setImage(post.url.startsWith('https://i.redd.it') ? post.url : null)
      .setFooter({ text: `ID: ${post.id}` })
      .setTimestamp(Math.floor(post.created_utc * 1000));

      if (post.url.startsWith('https://v.redd.it')) {
        embed.addFields([
          { name: '** **', value: `**[🎥 This is a video! Press to play video.](${post.url})**` }
        ])
      }
      if (post.url.startsWith('https://www.reddit.com/gallery')) {
        embed.addFields([
          { name: '** **', value: `**[🖼️ This is a gallery! Press to view full gallery.](${post.url})**` }
        ])
        embed.setImage(`https://i.redd.it/${post.gallery_data.items[0].media_id}.${post.media_metadata[post.gallery_data.items[0].media_id].m.split('/')[1]}`)
      }
  
      await interaction.followUp({ embeds: [embed] });
    }
  
  async chatInputRav(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("user");
    
    return interaction.followUp({
      content:
        `Search **${user.username}**'s avatar.\n[\`[Google]\`](<https://lens.google.com/uploadbyurl?url=${user.displayAvatarURL({ size: 2048, dynamic: true })}>) ` +
        `[\`[TinEye]\`](<https://www.tineye.com/search/?&url=${user.displayAvatarURL({ size: 2048, dynamic: true })}>) ` +
        `[\`[Bing]\`](<https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${user.displayAvatarURL({ size: 2048, dynamic: true })}>)`,
    });
  }

  async chatInputAvatar(interaction) {
    const guildav = await interaction.options.getBoolean("server");
    if (guildav) {
      if (!interaction.guild) return interaction.reply({ content: `${this.container.emojis.error} Sorry, no valid server found.`, ephemeral: true })
      let member = await interaction.options.getMember("user");
      if (!member) member = interaction.member;

      const avatar = member.displayAvatarURL({ dynamic: true, size: 1024 });

      await interaction.reply({
        files: [avatar],
      });
    } else {
      let member = await interaction.options.getUser("user");
      if (!member) member = interaction.user;

      const avatar = member.displayAvatarURL({ dynamic: true, size: 1024 });

      await interaction.reply({
        files: [avatar],
      });
    }
  }

  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   * @returns 
   */
  async chatInputIcon(interaction) {
    if (!interaction.guild) return interaction.reply({ ephemeral: true, content: `${this.container.emojis.error} This command can only be used in a server.` })
    const avatar = interaction.guild.iconURL({ size: 1024 });

    await interaction.reply({
      files: [avatar],
    });
  }

  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   * @returns 
   */
  async chatInputServerBanner(interaction) {
    if (!interaction.guild) return interaction.reply({ ephemeral: true, content: `${this.container.emojis.error} This command can only be used in a server.` })
    if (!interaction.guild.banner) return interaction.reply({ ephemeral: true, content: `${this.container.emojis.error} This server currently does not have a banner set.` })
    const avatar = interaction.guild.bannerURL({ size: 1024 });

    await interaction.reply({
      files: [avatar],
    });
  }

  async chatInputPhoenixAV(interaction) {
    await interaction.deferReply();

    let user = await interaction.options.getUser("user");
    if (!user) user = interaction.user;

    console.log("Creating image 1");
    const { createCanvas, loadImage } = require("@napi-rs/canvas");
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext("2d");

    console.log("Creating image 2");
    await loadImage(user.displayAvatarURL({ format: "png", size: 1024 }))
      .then(async (img) => {
        ctx.drawImage(img, 0, 0, canvas.height, canvas.width);
      })
      .catch((err) => {
        return interaction.followUp(`${this.container.emojis.error} ${err}`);
      });

    console.log("Creating image 3");
    await loadImage("https://phoenix.sylveondev.xyz/phoenixtrans.png")
      .then(async (img) => {
        ctx.drawImage(img, 0, 0, canvas.height, canvas.width);
      })
      .catch((err) => {
        return interaction.followUp(`${this.container.emojis.error} ${err}`);
      });

    console.log("Creating image 4");
    const attachment = new AttachmentBuilder(await canvas.encode("png"), {
      name: `phoenixav.png`,
    });
    await interaction.followUp({
      files: [attachment],
    });
  }

  async chatInputWolfram(interaction) {
    await interaction.deferReply();

    const unfilteredquery = await interaction.options.getString("query");
    const query = encodeURIComponent(unfilteredquery);

    await fetch(
      `https://api.wolframalpha.com/v1/result?i=${query}&appid=${process.env["wolframkey"]}`,
    )
      .then(async (response) => {
        if (response.status != 200) {
          return interaction.followUp(`${this.container.emojis.error} Not found or error occured.`);
        }
        const result = await response.text();
        if (!result) {
          return interaction.followUp(`${this.container.emojis.error} Not found or error occured.`);
        }
        interaction.followUp(`${this.container.emojis.info} ${result}`);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputCat(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://cataas.com");
    const stream = await getStream("/cat");

    if (stream.statusCode != 200) {
      return interaction.followUp(`${this.container.emojis.error} ${stream.status}`);
    }

    await interaction.followUp({ files: [stream] });
  }

  async chatInputDog(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://dog.ceo");
    const stream = await getStream("/api/breeds/image/random");

    if (stream.statusCode != 200) {
      return interaction.followUp(`${this.container.emojis.error} ${stream.status}`);
    }

    const obj = await stream.json();

    await interaction.followUp({ files: [obj.message] });
  }

  async chatInputKitten(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://cataas.com");
    const stream = await getStream("/cat/kitten");

    if (stream.statusCode != 200) {
      return interaction.followUp(`${this.container.emojis.error} ${stream.status}`);
    }

    await interaction.followUp({ files: [stream] });
  }

  async chatInputMeme(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://meme-api.com");
    const stream = await getStream("/gimme");

    if (stream.statusCode != 200) {
      return interaction.followUp(`${this.container.emojis.error} ${stream.status}`);
    }

    const obj = await stream.json();

    if (obj.nsfw == true && !interaction.channel.nsfw) {
      return interaction.followUp(`${this.container.emojis.warning} The fetched post was marked as nsfw, thus I will not send it here.`);
    }
    await interaction.followUp({
      content: `${obj.title} | ${obj.subreddit} | [Post link](<${obj.postLink}>)`,
      files: [obj.url],
    });
  }
}
module.exports = {
  PingCommand,
};
