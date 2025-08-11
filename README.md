## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd reddit-auth-webapp
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Create a `.env` file:**
   Copy the `.env.example` file to `.env` and fill in your Reddit API credentials:
   ```
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   REDIRECT_URI=http://localhost:8080/auth/reddit/callback
   ```

## Deployment

This application can be deployed on Heroku. Follow these steps:

1. **Create a new Heroku app:**
   ```
   heroku create your-app-name
   ```

2. **Set environment variables on Heroku:**
   ```
   heroku config:set CLIENT_ID=your_client_id
   heroku config:set CLIENT_SECRET=your_client_secret
   heroku config:set REDIRECT_URI=https://your-app-name.herokuapp.com/auth/reddit/callback
   ```

3. **Deploy the application:**
   ```
   git push heroku main
   ```

4. **Open the application:**
   ```
   heroku open
   ```