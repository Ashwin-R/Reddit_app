const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../firebase'); // Make sure this path is correct
const {
  getAuthUrl,
  getUserMetrics,
  exchangeCodeForToken,
  getRecentSubredditsWithPostsAndComments,
  sanitizeForFirestore
} = require('../reddit.js');

const router = express.Router();

// Step 1: Redirect to Reddit for authentication
router.get('/login', (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

// Step 2: Handle the redirect from Reddit after authentication
router.get('/reddit/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization failed. No code provided.');
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const userMetrics = await getUserMetrics(accessToken);
    const username = userMetrics?.info?.name || 'unknown_user';

    // Save access token and user info in session
    req.session.accessToken = accessToken;
    req.session.username = username;

    res.render('dashboard', { userMetrics });

    const subredditActivity = await getRecentSubredditsWithPostsAndComments(accessToken, username);
    await db.collection('reddit-activity').doc(username).set(sanitizeForFirestore(subredditActivity));

    // save to Firestore or file
    await db.collection('reddit-user-info').doc(username).set(userMetrics, { merge: true });

  } catch (error) {
    console.error('Error fetching or uploading user metrics:', error);
    res.status(500).send('Error fetching or uploading user metrics.');
  }
});

// Step 3: Handle direct or refreshed access to the dashboard
router.get('/dashboard', async (req, res) => {
  const { accessToken, username } = req.session;

  if (!accessToken || !username) {
    return res.redirect('/'); // redirect to home/login if session expired
  }

  try {
    const userMetrics = await getUserMetrics(accessToken);
    res.render('dashboard', { userMetrics });
  } catch (error) {
    console.error('Error fetching user metrics on refresh:', error);
    res.status(500).send('Failed to reload dashboard.');
  }
});

// Default route
router.get('/', (req, res) => {
  res.send('Auth route works!');
});

module.exports = router;
