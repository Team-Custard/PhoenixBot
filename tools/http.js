// Small helpers around Node's built-in fetch (replaces the bent and node-fetch packages).

const DEFAULT_TIMEOUT = 15_000;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "User-Agent": "PhoenixBot (https://phoenix.sylveondev.xyz)", ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(options.timeout ?? DEFAULT_TIMEOUT),
  });
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return response;
}

async function getJson(url, options) {
  return (await request(url, options)).json();
}

async function getText(url, options) {
  return (await request(url, options)).text();
}

/** Downloads a file and returns something you can pass to `files: [...]`. */
async function getAttachment(url, baseName = "image") {
  const response = await request(url);
  const type = response.headers.get("content-type") ?? "";
  const extension = type.split("/")[1]?.split(/[;+]/)[0] || "png";
  return { attachment: Buffer.from(await response.arrayBuffer()), name: `${baseName}.${extension}` };
}

module.exports = { request, getJson, getText, getAttachment };
