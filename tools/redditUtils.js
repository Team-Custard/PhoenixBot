const getRandomItemFrom = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)]
}

const makeRequest = async (endpoint) => {
    const url = `https://reddit.com/${endpoint}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Sec-GPC': '1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'mamoruuu/random-reddit',
            'authorization': `Basic ${process.env['redditCredentials']}`
        }
    });
    const body = await response.json().catch(() => undefined);
    if (!body) return undefined;
    return (Array.isArray(body) ? body[0] : body);
}


exports.getPost = async (subreddit) => {
    const pickedSub = Array.isArray(subreddit) ? getRandomItemFrom(subreddit) : subreddit
    const response = await makeRequest(`r/${pickedSub}.json?limit=50`);
    if (!response) return undefined;
    const children = Array.isArray(response) ? getRandomItemFrom(response)?.data.children : response?.data?.children;
    const child = Array.isArray(children) ? getRandomItemFrom(children) : children;
    return child.data;
}