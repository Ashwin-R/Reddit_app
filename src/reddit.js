const axios = require('axios');

const BASE_URL = 'https://oauth.reddit.com';

async function getUserInfo(accessToken) {
  const response = await axios.get(`${BASE_URL}/api/v1/me`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    }
  });
  return response.data;
}

async function getUserSubscriptions(accessToken) {
  const response = await axios.get(`${BASE_URL}/subreddits/mine/subscriber`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    },
    params: { limit: 100 }
  });
  return response.data.data.children.map(sub => sub.data.display_name);
}

async function getUserPosts(accessToken, username, limit = 10) {
  const response = await axios.get(`${BASE_URL}/user/${username}/submitted`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    },
    params: { limit }
  });

  return response.data.data.children.map(post => {
    const data = post.data;
    return {
      id: data.id,
      title: data.title,
      url: data.url,
      subreddit: data.subreddit,
      link_flair_text: data.link_flair_text,
      created_utc: data.created_utc,
      selftext: data.selftext,
      ups: data.ups,
      downs: data.downs,
      permalink: data.permalink,
    };
  });
}

async function getUserComments(accessToken, username, limit = 10) {
  const response = await axios.get(`${BASE_URL}/user/${username}/comments`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    },
    params: { limit }
  });

  return response.data.data.children.map(comment => {
    const data = comment.data;
    return {
      id: data.id,
      body: data.body,
      subreddit: data.subreddit,
      ups: data.ups,
      downs: data.downs,
      parent_id: data.parent_id,
      link_id: data.link_id,
      permalink: data.permalink,
      created_utc: data.created_utc
    };
  });
}

async function getThingById(accessToken, thingId) {
  const response = await axios.get(`${BASE_URL}/api/info`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    },
    params: { id: thingId }
  });

  if (response.data && response.data.data && response.data.data.children.length > 0) {
    return response.data.data.children[0].data;
  }
  return null;
}

async function getUserCommentsWithParents(accessToken, username, limit = 10) {
  const comments = await getUserComments(accessToken, username, limit);

  const commentsWithParents = await Promise.all(comments.map(async comment => {
    if (comment.parent_id) {
      const parentData = await getThingById(accessToken, comment.parent_id);
      return {
        ...comment,
        parent: parentData ? {
          id: parentData.id,
          type: parentData.name.startsWith('t3_') ? 'post' : 'comment',
          subreddit: parentData.subreddit,
          title: parentData.title || null,
          body: parentData.body || null,
          permalink: parentData.permalink
        } : null
      };
    } else {
      return { ...comment, parent: null };
    }
  }));

  return commentsWithParents;
}

function getAuthUrl(state = 'random_state_string') {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    response_type: 'code',
    state: state,
    redirect_uri: process.env.REDIRECT_URI,
    duration: 'temporary',
    scope: 'identity history read mysubreddits'
  });
  const url = `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
  console.log('OAuth URL:', url);
  return url;
}

async function exchangeCodeForToken(code) {
  const basicAuth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    'https://www.reddit.com/api/v1/access_token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.REDIRECT_URI
    }),
    {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.USER_AGENT
      }
    }
  );
  return response.data.access_token;
}

async function getKarmaBreakdown(accessToken) {
  const response = await axios.get(`${BASE_URL}/api/v1/me/karma`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    }
  });
  return response.data;
}

function getCleanIcon(data) {
  const icon = data.icon_img || data.community_icon || '';
  return icon && icon.startsWith('http') ? icon.split('?')[0] : '';
}

async function getSubredditDetails(accessToken, subreddits) {
  const headers = {
    Authorization: `bearer ${accessToken}`,
    'User-Agent': process.env.USER_AGENT
  };

  const results = await Promise.all(
    subreddits.slice(0, 10).map(async (sub) => {
      try {
        const res = await axios.get(`${BASE_URL}/r/${sub}/about`, { headers });
        const data = res.data.data;
        return {
          name: sub,
          icon: getCleanIcon(data),
          subscribers: data.subscribers,
          description: data.public_description || ''
        };
      } catch (err) {
        return { name: sub, icon: '', subscribers: 'Unknown', description: '' };
      }
    })
  );

  return results;
}

async function getUserUpvotedPosts(accessToken, username, limit = 10) {
  const response = await axios.get(`${BASE_URL}/user/${username}/upvoted`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    },
    params: { limit }
  });
  return response.data.data.children.map(post => post.data);
}

async function getUserDownvotedPosts(accessToken, username, limit = 10) {
  const response = await axios.get(`${BASE_URL}/user/${username}/downvoted`, {
    headers: {
      Authorization: `bearer ${accessToken}`,
      'User-Agent': process.env.USER_AGENT
    },
    params: { limit }
  });
  return response.data.data.children.map(post => post.data);
}

async function getUserMetrics(accessToken) {
  const info = await getUserInfo(accessToken);
  const username = info.name;
  const [subscriptions, posts, comments, karmaBreakdown, upvotedPosts, downvotedPosts] = await Promise.all([
    getUserSubscriptions(accessToken),
    getUserPosts(accessToken, username),
    getUserCommentsWithParents(accessToken, username),
    getKarmaBreakdown(accessToken),
    getUserUpvotedPosts(accessToken, username),
    getUserDownvotedPosts(accessToken, username)
  ]);
  const subredditDetails = await getSubredditDetails(accessToken, subscriptions);
  return {
    info,
    subscriptions: subredditDetails,
    posts,
    comments,
    upvotedPosts,
    downvotedPosts,
    karmaBreakdown
  };
}

async function getRecentSubredditsWithPostsAndComments(accessToken, username) {
  // Step 1: Fetch recent user posts and comments
  const [posts, comments] = await Promise.all([
    getUserPosts(accessToken, username, 50),
    getUserComments(accessToken, username, 50)
  ]);

  // Step 2: Get the most recent 5 *unique* subreddits
  const allSubreddits = [...posts, ...comments].map(item => item.subreddit);
  const uniqueSubs = [...new Set(allSubreddits)].slice(0, 5);

  const headers = {
    Authorization: `bearer ${accessToken}`,
    'User-Agent': process.env.USER_AGENT
  };

  // Step 3: For each subreddit, get 20 latest posts
  const subredditPosts = {};
  for (const subreddit of uniqueSubs) {
    try {
      const res = await axios.get(`${BASE_URL}/r/${subreddit}/new?limit=20`, { headers });
      subredditPosts[subreddit] = res.data.data.children.map(p => p.data);
    } catch (err) {
      console.error(`Error fetching posts for r/${subreddit}:`, err.message);
      subredditPosts[subreddit] = [];
    }
  }

  // Step 4: For each post, get only the `body` of each comment
  const commentsByPostId = {};
  for (const subreddit of uniqueSubs) {
    for (const post of subredditPosts[subreddit]) {
      try {
        const { data } = await axios.get(`${BASE_URL}/comments/${post.id}?limit=20`, { headers });
        const comments = data[1].data.children.map(c => {
          const d = c.data;
          return {
            id: d.id,
            author: d.author || "[deleted]",
            body: d.body || ""
          };
        }); // filter out undefined or null

        commentsByPostId[post.id] = comments;

      } catch (err) {
        console.error(`Error fetching comments for post ${post.id}:`, err.message);
        commentsByPostId[post.id] = [];
      }
    }
  }

  // Final structured output with only post data and stripped-down comment text
  return {
    subreddits: uniqueSubs,
    postsBySubreddit: subredditPosts,
    commentsByPostId
  };
}

function sanitizeForFirestore(obj, depth = 0, seen = new WeakSet()) {
  if (depth > 20 || typeof obj !== 'object' || obj === null) return obj;
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  const result = {};
  for (const key in obj) {
    result[key] = sanitizeForFirestore(obj[key], depth + 1, seen);
  }
  return result;
}


module.exports = {
  getUserInfo,
  getUserSubscriptions,
  getUserPosts,
  getUserComments,
  getUserCommentsWithParents,
  getAuthUrl,
  getUserMetrics,
  exchangeCodeForToken,
  getKarmaBreakdown,
  getSubredditDetails,
  getUserUpvotedPosts,
  getUserDownvotedPosts,
  getThingById,
  getRecentSubredditsWithPostsAndComments,
  sanitizeForFirestore
};
