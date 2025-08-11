const admin = require('firebase-admin');
const serviceAccount = require('../cmst-reddit-analysis-firebase-adminsdk-76tgx-bc61bd8726.json'); // Download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = db;