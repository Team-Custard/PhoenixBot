const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const bent = require("bent");
const fetch = require("node-fetch");
const { AttachmentBuilder } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "fun",
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
        .setName("fun")
        .setDescription("Fun commands")
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
        .setDMPermission(false),
    );
  }

  async chatInputAvatar(interaction) {
    const guildav = await interaction.options.getBoolean("server");
    if (guildav) {
      let member = await interaction.options.getMember("user");
      if (!member) member = interaction.member;

      const avatar = member.avatarURL({ dynamic: true, size: 1024 });

      await interaction.reply({
        files: [avatar],
      });
    } else {
      let member = await interaction.options.getUser("user");
      if (!member) member = interaction.user;

      const avatar = member.avatarURL({ dynamic: true, size: 1024 });

      await interaction.reply({
        files: [avatar],
      });
    }
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
    await loadImage(user.avatarURL({ format: "png", size: 1024 }))
      .then(async (img) => {
        ctx.drawImage(img, 0, 0, canvas.height, canvas.width);
      })
      .catch((err) => {
        return interaction.followUp(`:x: ${err}`);
      });

    console.log("Creating image 3");
    await loadImage("https://phoenixbot.epicgamer.org/phoenixtrans.png")
      .then(async (img) => {
        ctx.drawImage(img, 0, 0, canvas.height, canvas.width);
      })
      .catch((err) => {
        return interaction.followUp(`:x: ${err}`);
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
        if (response.status != 200)
          return interaction.followUp(`:x: Not found or error occured.`);
        const result = await response.text();
        if (!result)
          return interaction.followUp(`:x: Not found or error occured.`);
        interaction.followUp(`:information_source: ${result}`);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputCat(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://cataas.com/");
    const stream = await getStream("/cat");

    if (stream.statusCode != 200)
      return interaction.followUp(`:x: ${stream.status}`);

    await interaction.followUp({ files: [stream] });
  }

  async chatInputDog(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://dog.ceo");
    const stream = await getStream("/api/breeds/image/random");

    if (stream.statusCode != 200)
      return interaction.followUp(`:x: ${stream.status}`);

    const obj = await stream.json();

    await interaction.followUp({ files: [obj.message] });
  }

  async chatInputKitten(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://cataas.com/");
    const stream = await getStream("/cat/kitten");

    if (stream.statusCode != 200)
      return interaction.followUp(`:x: ${stream.status}`);

    await interaction.followUp({ files: [stream] });
  }

  async chatInputMeme(interaction) {
    await interaction.deferReply();
    const getStream = await bent("https://meme-api.com");
    const stream = await getStream("/gimme");

    if (stream.statusCode != 200)
      return interaction.followUp(`:x: ${stream.status}`);

    const obj = await stream.json();

    if (obj.nsfw == true && !interaction.channel.nsfw)
      return interaction.followUp(
        `Refusing to send the scraped reddit post because the post is nsfw.`,
      );
    await interaction.followUp({
      content: `${obj.title} | ${obj.subreddit} | [Post link](<${obj.postLink}>)`,
      files: [obj.url],
    });
  }
}
module.exports = {
  PingCommand,
};
