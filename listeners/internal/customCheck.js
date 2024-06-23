const { Listener } = require("@sapphire/framework");
const { EmbedBuilder, Colors } = require("discord.js");
const fs = require("fs");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
      name: "customCheck",
    });
  }
  run(client) {
    setInterval(async function() {
      if (require("../../config.json").process.botmode != "custom") return;
      const bots = JSON.parse(
        fs.readFileSync(require("../../custombot").list, "utf8"),
      );

      const foundToken = bots.find((b) => b.token == client.token);
      if (!foundToken) {
        console.log(require("../../custombot").owner);
        console.log(`custombot_check: FAIL ${client.id}`);
        const former = require("../../custombot").owner;
        const user = await client.users
          .fetch(former.user)
          .catch(() => undefined);
        if (user) {
          const embed = new EmbedBuilder()
            .setTitle(`Your bot has expired`)
            .setDescription(
              `Hello ${user}, this is an update about your bot, **${client.user.username}**. It appears that your custom bot has expired, so it won't function anymore.`,
            )
            .addFields([
              {
                name: `What now?`,
                value: `> PhoenixBot will take over for the custom bot. Everything will continue to function as planned. If you don't have PhoenixBot, you can invite it [here](https://phoenix.sylveondev.xyz/invite).\n> Phoenix's prefix will set to the custom bot's prefix.\nThank you for your interest in using Custom Phoenix. We hope you had fun with our service.`,
              },
            ])
            .setThumbnail(client.user.avatarURL({ dynamic: true, size: 256 }))
            .setColor(Colors.Orange)
            .setTimestamp(new Date());
          await user.send({ embeds: [embed] }).catch(() => undefined);
        }
        process.exit();
      }
 else {console.log(`custombot_check: PASS ${client.id}`);}
    }, 1000 * 10);
  }
}
module.exports = {
  ReadyListener,
};
