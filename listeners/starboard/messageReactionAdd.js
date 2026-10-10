const { Listener } = require("@sapphire/framework");
const { handleStarReaction } = require("../../tools/starboard");

class StarboardReactionAdd extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageReactionAdd" });
  }

  run(reaction, user) {
    return handleStarReaction(reaction, user, true);
  }
}

module.exports = { StarboardReactionAdd };
