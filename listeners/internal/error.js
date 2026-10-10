const { Listener } = require("@sapphire/framework");
const { report } = require("../../tools/errorReporter");

class ClientErrorListener extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "error" });
  }

  run(error) {
    return report("Caught client error", error);
  }
}
module.exports = { ClientErrorListener };
