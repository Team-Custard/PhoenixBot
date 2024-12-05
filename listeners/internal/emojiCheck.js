const { Listener, container } = require("@sapphire/framework");
const { ActivityType, REST } = require("discord.js");
const fs = require('fs');
const { setTimeout } = require("timers/promises");

function fetchImg(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const mimeType = 'image/' + imagePath.split('.').pop();
  return `data:${mimeType};base64,${base64Image}`;
}

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      name: "emojiCheck",
      event: "ready",
    });
  }
  async run(client) {
    const rest = new REST().setToken(client.token);

    const emojiList = {
        success: "✅",
        warning: "⚠️",
        info: "❔",
        error: "❌",
        loading: "⭕"
    }

    const emojis = await rest.get(`/applications/${client.id}/emojis`).catch(undefined);
    if (emojis) {
        console.log("Starting emoji registration...");
        const successEmoji = emojis.items.find(i => i.name === "success");
        const errorEmoji = emojis.items.find(i => i.name === "error");
        const warningEmoji = emojis.items.find(i => i.name === "warning");
        const infoEmoji = emojis.items.find(i => i.name === "info");
        const loadingEmoji = emojis.items.find(i => i.name === "loading");
        if (successEmoji) {
            emojiList.success = `<:${successEmoji.name}:${successEmoji.id}>`;
        }
        else {
            const emoji = fetchImg(__dirname+"/../../static/success.png");
            const emojiPayload = await rest.post(`/applications/${client.id}/emojis`, {
                body: {
                    image: emoji,
                    name: "success"
                }
            })
            .catch(console.error);
            if (emojiPayload) {
                console.log(`Registered success emoji successfully.`)
                emojiList.success = `<:${emojiPayload.name}:${emojiPayload.id}>`;
            }
        }
        await setTimeout(250);
        if (errorEmoji) {
            emojiList.error = `<:${errorEmoji.name}:${errorEmoji.id}>`;
        }
        else {
            const emoji = fetchImg(__dirname+"/../../static/error.png");
            const emojiPayload = await rest.post(`/applications/${client.id}/emojis`, {
                body: {
                    image: emoji,
                    name: "error"
                }
            })
            .catch(console.error);
            if (emojiPayload) {
                console.log(`Registered error emoji successfully.`)
                emojiList.error = `<:${emojiPayload.name}:${emojiPayload.id}>`;
            }
        }
        await setTimeout(250);
        if (warningEmoji) {
            emojiList.warning = `<:${warningEmoji.name}:${warningEmoji.id}>`;
        }
        else {
            const emoji = fetchImg(__dirname+"/../../static/warning.png");
            const emojiPayload = await rest.post(`/applications/${client.id}/emojis`, {
                body: {
                    image: emoji,
                    name: "warning"
                }
            })
            .catch(console.error);
            if (emojiPayload) {
                console.log(`Registered warning emoji successfully.`)
                emojiList.warning = `<:${emojiPayload.name}:${emojiPayload.id}>`;
            }
        }
        await setTimeout(250);
        if (infoEmoji) {
            emojiList.info = `<:${infoEmoji.name}:${infoEmoji.id}>`;
        }
        else {
            const emoji = fetchImg(__dirname+"/../../static/info.png");
            const emojiPayload = await rest.post(`/applications/${client.id}/emojis`, {
                body: {
                    image: emoji,
                    name: "info"
                }
            })
            .catch(console.error);
            if (emojiPayload) {
                console.log(`Registered info emoji successfully.`)
                emojiList.info = `<:${emojiPayload.name}:${emojiPayload.id}>`;
            }
        }
        await setTimeout(250);
        if (loadingEmoji) {
            emojiList.loading = `<a:${loadingEmoji.name}:${loadingEmoji.id}>`;
        }
        else {
            const emoji = fetchImg(__dirname+"/../../static/loading.gif");
            const emojiPayload = await rest.post(`/applications/${client.id}/emojis`, {
                body: {
                    image: emoji,
                    name: "loading"
                }
            })
            .catch(console.error);
            if (emojiPayload) {
                console.log(`Registered loading emoji successfully.`)
                emojiList.loading = `<:${emojiPayload.name}:${emojiPayload.id}>`;
            }
        }
        await setTimeout(250);
        console.log("Emojis loaded successfully.")
    }
    container.emojis = emojiList;
  }
}
module.exports = {
  ReadyListener,
};
