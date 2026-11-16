// Welcome and goodbye cards: an image with the member's avatar and a few lines of
// text (placeholders work in them), on the server's own background or Phoenix's.
// Used by the welcomer listeners and by the dashboard's preview.
const fs = require("fs");
const path = require("path");
const { render } = require("./placeholders");

const CARD_DIR = path.join(__dirname, "../static/greetingcards");
const WIDTH = 1100;
const HEIGHT = 500;
const KINDS = ["welcome", "goodbye"];

const DEFAULTS = {
  welcome: { title: "Welcome!", subtitle: "{{displayname}} just joined {{servername}}", footer: "Member #{{membercount}}" },
  goodbye: { title: "Goodbye!", subtitle: "{{displayname}} left the server", footer: "We're now {{membercount}} members" },
};

/** Where a server's custom background for one kind of card is kept. */
function backgroundPath(guildId, kind) {
  if (!KINDS.includes(kind) || !/^\d{17,20}$/.test(String(guildId))) throw new Error("Bad card");
  return path.join(CARD_DIR, `${guildId}-${kind}.img`);
}

function hasBackground(guildId, kind) {
  return fs.existsSync(backgroundPath(guildId, kind));
}

const FONT_DIR = path.join(__dirname, "../static/fonts");
let fontReady = false;
function font(weight, size) {
  if (!fontReady) {
    // Geist (SIL Open Font License, static/fonts), so cards look the same on every
    // machine whatever fonts are installed.
    const { GlobalFonts } = require("@napi-rs/canvas");
    for (const file of ["Geist-Bold.ttf", "Geist-SemiBold.ttf"]) {
      try {
        GlobalFonts.registerFromPath(path.join(FONT_DIR, file), "PhoenixCard");
      }
      catch {
        // Falls back to the system's sans-serif font.
      }
    }
    fontReady = true;
  }
  return `${weight} ${size}px PhoenixCard, sans-serif`;
}

/** Shrinks text (and finally cuts it with …) until it fits the width. */
function fitText(ctx, text, maxWidth, weight, size, minSize) {
  let current = size;
  ctx.font = font(weight, current);
  while (ctx.measureText(text).width > maxWidth && current > minSize) {
    current -= 2;
    ctx.font = font(weight, current);
  }
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

async function loadRemoteImage(url) {
  if (!url) return null;
  const { loadImage } = require("@napi-rs/canvas");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    return await loadImage(Buffer.from(await response.arrayBuffer()));
  }
  catch {
    return null;
  }
}

/** Draws an image so it covers the whole card, cropping the edges like CSS "cover". */
function drawCover(ctx, image) {
  const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
}

function defaultBackground(ctx, kind) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  if (kind === "goodbye") {
    gradient.addColorStop(0, "#1b1726");
    gradient.addColorStop(1, "#3a3150");
  }
  else {
    gradient.addColorStop(0, "#241325");
    gradient.addColorStop(0.55, "#5a1f2d");
    gradient.addColorStop(1, "#e2571e");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // A few soft embers, so the default doesn't look flat.
  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  glow(WIDTH * 0.85, HEIGHT * 0.15, 320, kind === "goodbye" ? "rgba(140,120,200,0.25)" : "rgba(255,160,70,0.35)");
  glow(WIDTH * 0.1, HEIGHT * 0.95, 260, kind === "goodbye" ? "rgba(90,80,140,0.3)" : "rgba(255,90,60,0.25)");
}

/**
 * Renders a card to a PNG buffer.
 * @param {object} options
 * @param {"welcome"|"goodbye"} options.kind
 * @param {string} options.guildId
 * @param {object} options.ctx Placeholder values (contextFrom()).
 * @param {{ title?: string, subtitle?: string, footer?: string, overlay?: number }} [options.card] The server's settings.
 * @param {Buffer|null} [options.background] A background to use instead of the saved one (dashboard preview).
 */
async function renderCard({ kind, guildId, ctx, card = {}, background }) {
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const canvas = createCanvas(WIDTH, HEIGHT);
  const g = canvas.getContext("2d");

  const bgBuffer = background !== undefined
    ? background
    : await Promise.resolve().then(() => fs.promises.readFile(backgroundPath(guildId, kind))).catch(() => null);
  const bgImage = bgBuffer ? await loadImage(bgBuffer).catch(() => null) : null;
  if (bgImage) drawCover(g, bgImage);
  else defaultBackground(g, kind);

  // Darkens the background so the text stays readable (0 = none, 100 = black).
  const overlay = Math.min(100, Math.max(0, Number(card.overlay ?? (bgImage ? 45 : 20))));
  g.fillStyle = `rgba(10, 6, 14, ${overlay / 100})`;
  g.fillRect(0, 0, WIDTH, HEIGHT);

  const accent = kind === "goodbye" ? "#a99bd6" : "#ff8a3d";
  const centerX = WIDTH / 2;

  // Avatar in a ring.
  const avatarSize = 190;
  const avatarY = 52;
  const avatar = await loadRemoteImage(ctx.user?.serverAvatarUrl ?? ctx.user?.avatarUrl);
  g.save();
  g.beginPath();
  g.arc(centerX, avatarY + avatarSize / 2, avatarSize / 2 + 9, 0, Math.PI * 2);
  g.fillStyle = accent;
  g.shadowColor = "rgba(0,0,0,0.45)";
  g.shadowBlur = 24;
  g.fill();
  g.restore();
  g.save();
  g.beginPath();
  g.arc(centerX, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  g.closePath();
  g.clip();
  if (avatar) {
    g.drawImage(avatar, centerX - avatarSize / 2, avatarY, avatarSize, avatarSize);
  }
  else {
    g.fillStyle = "#2a2233";
    g.fillRect(centerX - avatarSize / 2, avatarY, avatarSize, avatarSize);
  }
  g.restore();

  const defaults = DEFAULTS[kind];
  const text = (value, fallback) => render(value || fallback, ctx, { rich: false }).replace(/\s+/g, " ").trim();
  const title = text(card.title, defaults.title);
  const subtitle = text(card.subtitle, defaults.subtitle);
  const footer = text(card.footer, defaults.footer);

  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.shadowColor = "rgba(0,0,0,0.55)";
  g.shadowBlur = 12;
  g.fillStyle = "#ffffff";
  g.fillText(fitText(g, title, WIDTH - 120, 700, 64, 34), centerX, 340);
  g.fillStyle = "#f4ece6";
  g.fillText(fitText(g, subtitle, WIDTH - 140, 600, 36, 22), centerX, 395);
  if (footer) {
    g.fillStyle = accent;
    g.fillText(fitText(g, footer, WIDTH - 160, 600, 26, 18), centerX, 440);
  }
  return canvas.encode("png");
}

/**
 * Adds a card to a message (making a message if there was none). With a saved embed
 * that has no image of its own, the card becomes the embed's image.
 * A card that fails to draw is left out, so the message still goes out.
 */
async function attachCard(payload, { kind, guildId, ctx, card }) {
  let png;
  try {
    png = await renderCard({ kind, guildId, ctx, card });
  }
  catch (err) {
    console.error(`[greetingCard] Couldn't draw the ${kind} card for ${guildId}`, err);
    return payload;
  }
  const name = `${kind}.png`;
  const out = payload ? { ...payload } : { allowedMentions: { parse: [] } };
  out.files = [...(out.files ?? []), { attachment: png, name }];
  const [first, ...others] = out.embeds ?? [];
  if (first && !first.image?.url) out.embeds = [{ ...first, image: { url: `attachment://${name}` } }, ...others];
  return out;
}

module.exports = { renderCard, attachCard, backgroundPath, hasBackground, CARD_DIR, KINDS, DEFAULTS, WIDTH, HEIGHT };
