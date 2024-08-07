const formFactor = {
    password: String,
    host: String,
    port: String
}

/**
 * Parses a redis url into a normal connection thing.
 * @returns {formFactor} The parsed thingy.
 */
exports.parse = () => {
    const parsed = process.env["redisurl"].split(/[:,@   ]+/);
    parsed.splice(0, 2);
    return {
        password: parsed[0],
        host: parsed[1],
        port: parsed[2]
    };
}