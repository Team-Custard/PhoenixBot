// How much each server can have, without and with Phoenix Plus. One table for the
// bot's commands, the dashboard API and the dashboard's Plus page.
const LIMITS = {
  roleMenus: { label: "Role menus", free: 3, premium: 20 },
  tags: { label: "Tags", free: 25, premium: 500 },
  embeds: { label: "Saved embeds", free: 15, premium: 100 },
  autoresponses: { label: "Autoresponses", free: 25, premium: 100 },
  timedMessages: { label: "Timed messages", free: 5, premium: 25 },
  stickyMessages: { label: "Sticky messages", free: 5, premium: 25 },
};

/** { roleMenus: 3, tags: 25, ... } for a server with or without Plus. */
function limitsFor(premium) {
  return Object.fromEntries(Object.entries(LIMITS).map(([key, l]) => [key, premium ? l.premium : l.free]));
}

/** "You can have up to 3 role menus. Phoenix Plus raises this to 20." */
function limitMessage(key, premium) {
  const l = LIMITS[key];
  const name = l.label.toLowerCase();
  return premium
    ? `This server can have up to ${l.premium} ${name}.`
    : `Servers can have ${l.free} ${name}. Phoenix Plus raises this to ${l.premium}.`;
}

module.exports = { LIMITS, limitsFor, limitMessage };
