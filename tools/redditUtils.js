const Reddit = require('reddit');

const reddit = new Reddit({
  username: process.env['redditUsername'],
  password: process.env['redditPassword'],
  appId: process.env['redditAppID'],
  appSecret: process.env['redditSecret'],
  userAgent: 'Phoenix/1.0.0 (https://phoenix.sylveondev.xyz)'
});

const getRandomItemFrom = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)]
}

const makeRequest = async (subreddit) => {
    const pickedSub = Array.isArray(subreddit) ? getRandomItemFrom(subreddit) : subreddit
    const body = await reddit.get(`/r/${pickedSub}.json?limit=50`);
    //const body = await response.json().catch(() => undefined);
    if (!body) return undefined;
    return (Array.isArray(body) ? body[0] : body);
}

exports.getPost = async (subreddit) => {
    const pickedSub = Array.isArray(subreddit) ? getRandomItemFrom(subreddit) : subreddit
    const response = await makeRequest(subreddit);
    if (!response) return undefined;
    const children = Array.isArray(response) ? getRandomItemFrom(response)?.data.children : response?.data.children;
    const child = Array.isArray(children) ? getRandomItemFrom(children) : children;
    return child.data;
}