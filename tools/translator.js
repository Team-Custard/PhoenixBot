const { Translate } = require("@google-cloud/translate").v2;
const { Translator } = require("deepl-node");

let google;
let deepl;

function googleClient() {
  google ??= new Translate({ key: process.env["googlekey"], projectId: process.env["googleid"] });
  return google;
}

function deeplClient() {
  deepl ??= new Translator(process.env["deeplkey"], {
    appInfo: { appName: "PhoenixBot", appVersion: "1.0.0" },
    maxRetries: 5,
    minTimeout: 10000,
  });
  return deepl;
}

/** DeepL only accepts regional codes for English and Portuguese. */
function deeplTarget(locale) {
  const lower = locale.toLowerCase();
  if (lower.startsWith("en")) return lower === "en-gb" ? "en-GB" : "en-US";
  if (lower.startsWith("pt")) return lower === "pt-pt" ? "pt-PT" : "pt-BR";
  if (lower.startsWith("zh")) return "zh";
  return lower.slice(0, 2);
}

/**
 * Translates text into a Discord locale (e.g. "en-US").
 * @param {string} text
 * @param {object} options
 * @param {"google"|"deepl"} [options.engine]
 * @param {string} [options.locale]
 * @returns {Promise<{ text: string, from: string, to: string, engine: string }>}
 */
async function translateText(text, { engine = "google", locale = "en-US" } = {}) {
  if (engine === "deepl") {
    const result = await deeplClient().translateText(text, null, deeplTarget(locale));
    return { text: result.text, from: result.detectedSourceLang, to: locale, engine: "DeepL" };
  }
  const client = googleClient();
  let [detections] = await client.detect(text);
  if (Array.isArray(detections)) detections = detections[0];
  const from = detections.language;
  const [translated] = await client.translate(text, { format: "text", from: from.substring(0, 2), to: locale.substring(0, 2) });
  return { text: translated, from, to: locale, engine: "Google" };
}

module.exports = { translateText };
