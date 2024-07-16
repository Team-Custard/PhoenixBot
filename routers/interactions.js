const express = require("express");
const UserDB = require("../tools/UserDB");
const {
  verifyKeyMiddleware,
  InteractionType,
  InteractionResponseType,
} = require("discord-interactions");

const router = express.Router();

router.post(
  "/interactions",
  verifyKeyMiddleware(process.env["CLIENTPUBKEY"]),
  (req, res) => {
    const message = req.body;
    if (message.type === InteractionType.PING) {
      res.send({
        type: InteractionResponseType.PONG,
      });
    }
  },
);

router.post(
  "/staging/interactions",
  verifyKeyMiddleware(process.env["STAGINGPUBKEY"]),
  (req, res) => {
    const message = req.body;
    if (message.type === InteractionType.PING) {
      res.send({
        type: InteractionResponseType.PONG,
      });
    }
  },
);

router.post(
  "/testing/interactions",
  verifyKeyMiddleware(process.env["TESTPUBKEY"]),
  (req, res) => {
    const message = req.body;
    console.log(message.type);
    if (message.type === InteractionType.PING) {
      console.log("Handling http ping");
      res.send({
        type: InteractionResponseType.PONG,
      });
    } else if (message.type === InteractionType.APPLICATION_COMMAND) {
      res.status(200).send();
    } else {
      console.log("Unknown Type");
      res.status(400).send({ error: "Unknown Type" });
    }
  },
);

module.exports = router;
