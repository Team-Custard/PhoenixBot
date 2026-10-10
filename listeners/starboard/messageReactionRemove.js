const { Listener } = require("@sapphire/framework");
const { handleStarReaction } = require("../../tools/starboard");

class StarboardReactionRemove extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageReactionRemove" });
  }

  run(reaction, user) {
    return handleStarReaction(reaction, user, false);
  }
}

module.exports = { StarboardReactionRemove };
