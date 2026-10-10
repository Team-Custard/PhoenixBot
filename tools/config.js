// Central place for reading config.json and environment-derived settings.
// Most files still `require("../config.json")` directly, which is fine; new code
// should prefer this module so mode/token logic lives in one spot.
const settings = require("../config.json");

const botmode = settings.process.botmode;

const TOKEN_ENV = {
  prod: "TOKEN",
  dev: "STAGINGTOKEN",
  test: "TESTTOKEN",
};

const PREFIX_FOR_MODE = {
  prod: settings.prefix,
  custom: settings.prefix,
  dev: settings.stagingprefix,
  test: settings.testingprefix,
};

// The settings collection is shared between prod and custom bots; dev/test use a
// separate staging collection so testing never touches real server settings.
const usesProdCollections = botmode === "prod" || botmode === "custom";

const dashboard = settings.dashboard ?? {};
const dashboardDevmode = dashboard.devmode === true || dashboard.devmode === "on";

module.exports = {
  settings,
  botmode,
  usesProdCollections,
  defaultPrefix: PREFIX_FOR_MODE[botmode] ?? settings.prefix,
  token: () => process.env[TOKEN_ENV[botmode]],
  // OAuth2 secret for the dashboard login (the app in dashboard.clientid).
  clientSecret: () => process.env.CLIENTSECRET,
  dashboard: {
    ...dashboard,
    devmode: dashboardDevmode,
    // The OAuth client used to log into the dashboard.
    clientId: dashboard.clientid,
    baseUrl: dashboardDevmode
      ? `http://localhost:${dashboard.serverport ?? 8080}`
      : dashboard.fullredirecturl,
  },
  prefixDeprecation: {
    notice: settings.prefixDeprecation?.notice ?? true,
    cooldownHours: settings.prefixDeprecation?.cooldownHours ?? 24,
  },
};
