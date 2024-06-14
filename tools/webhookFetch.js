async function createWebhook(channel) {
  const wb = await channel
    .createWebhook({
      name: "PhoenixBot",
      avatar: "https://phoenix.sylveondev.xyz/phoenixlogo.png",
      reason: "Creating webhook for logging",
    })
    .then((webhook) => {
      console.log(
        `Created webhook ${webhook.name} in ${channel.id} succeessfully`,
      );
      return webhook;
    })
    .catch((err) => {
      console.error(`[error] Error creating webhook in ${channel.id}`, err);
      return undefined;
    });
  if (wb) return wb;
}

exports.find = async (channel) => {
  try {
    const webhooks = await channel.fetchWebhooks().catch(() => undefined);
    if (!webhooks) return;
    let webhook = webhooks.find((wh) => wh.token);
    if (!webhook) {
      console.log(`No webhook found for ${channel.id}. Attempting to create.`);
      webhook = await createWebhook(channel);
      if (!webhook) {
        return undefined;
      }
    }
    return webhook;
  }
 catch (err) {
    console.error(`[error] Error occured in webhook handler`, err);
  }
};
