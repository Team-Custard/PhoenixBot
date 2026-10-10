// Runs regexes from server admins (autoresponse triggers) in a separate thread with a
// time limit. A badly written regex can take minutes on the wrong text, and running it
// on the bot's own thread would freeze every server in the cluster. If one takes too
// long, the thread is replaced and that regex isn't used again until the bot restarts.
const { Worker } = require("worker_threads");

const TIMEOUT = 100;

const WORKER_CODE = `
const { parentPort } = require("worker_threads");
const cache = new Map();
parentPort.on("message", ({ id, pattern, flags, text }) => {
  try {
    const key = flags + "/" + pattern;
    let re = cache.get(key);
    if (!re) {
      re = new RegExp(pattern, flags);
      cache.set(key, re);
      if (cache.size > 2000) cache.delete(cache.keys().next().value);
    }
    re.lastIndex = 0;
    parentPort.postMessage({ id, result: re.test(text) });
  }
  catch {
    parentPort.postMessage({ id, result: false });
  }
});
`;

let worker = null;
let nextId = 0;
const pending = new Map();
const tooSlow = new Set();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(WORKER_CODE, { eval: true, resourceLimits: { maxOldGenerationSizeMb: 64 } });
  worker.unref();
  worker.on("message", ({ id, result }) => {
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    clearTimeout(job.timer);
    job.resolve(result);
  });
  worker.on("error", () => restart());
  worker.on("exit", () => {
    worker = null;
  });
  return worker;
}

function restart() {
  const old = worker;
  worker = null;
  old?.terminate().catch(() => undefined);
  // Anything still waiting on the old thread counts as "no match".
  for (const [id, job] of pending) {
    clearTimeout(job.timer);
    job.resolve(false);
    pending.delete(id);
  }
}

/**
 * Tests a regex against text with a time limit.
 * @returns {Promise<boolean>} false for no match, a regex that's too slow, or an invalid one.
 */
function safeTest(pattern, flags, text, timeout = TIMEOUT) {
  const key = `${flags}/${pattern}`;
  if (tooSlow.has(key)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      tooSlow.add(key);
      console.warn(`[autoresponse] A regex took longer than ${timeout}ms and was turned off until restart: /${pattern}/${flags}`);
      pending.delete(id);
      resolve(false);
      restart();
    }, timeout);
    pending.set(id, { resolve, timer });
    getWorker().postMessage({ id, pattern, flags, text });
  });
}

/** Stops the thread (for tests and shutdown). */
function stop() {
  restart();
}

module.exports = { safeTest, stop, tooSlow };
