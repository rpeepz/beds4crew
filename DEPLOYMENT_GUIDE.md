# 🚀 Deployment Guide - Property Rental Platform (Render.com)

**Deploy your full-stack property rental platform for FREE in under 30 minutes!**

This guide covers deploying both the React frontend and Node.js backend to Render.com with a MongoDB Atlas database.

---

## 📋 What You'll Need

- **GitHub Account** (free) - to host your code
- **MongoDB Atlas Account** (free) - for database hosting
- **Render.com Account** (free) - for app hosting
- **30 minutes** of your time

---

## 🗂️ Deployment Architecture

```
┌─────────────────┐
│   Users/Browser │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────────┐          ┌──────────────────┐
│  Frontend (Static)  │          │  Backend (API)   │
│  Render Static Site │◄─────────┤  Render Web Svc  │
│  React + Vite       │  Calls   │  Node.js/Express │
└─────────────────────┘          └────────┬─────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  MongoDB Atlas  │
                                 │   (Database)    │
                                 └─────────────────┘
```

---

## Part 1: Setup MongoDB Atlas Database

### Step 1.1: Create Free MongoDB Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with Google/GitHub (fastest) or email
3. Answer quick survey questions (select "I'm learning" if asked)
4. Click **"Create"** to create a free deployment
5. Choose configuration:
   - **Tier**: M0 Sandbox (FREE forever)
   - **Provider**: AWS
   - **Region**: us-east-1 (N. Virginia) or closest to you
   - **Cluster Name**: PropertyRentalDB (or your choice)
6. Click **"Create Deployment"**

### Step 1.2: Create Database User

1. In the security quickstart, create a database user:
   - **Username**: `propertyuser` (or your choice)
   - **Password**: Click "Autogenerate Secure Password" 
   - **⚠️ IMPORTANT**: Copy and save this password immediately!
2. Click **"Create Database User"**

### Step 1.3: Configure Network Access

1. For "Where would you like to connect from?":
   - Select **"My Local Environment"**
   - Click **"Add My Current IP Address"**
2. Also add Render's access:
   - Click **"Add IP Address"** again
   - Enter `0.0.0.0/0` (allows access from anywhere - needed for Render)
   - Description: "Render.com servers"
   - Click **"Add Entry"**
3. Click **"Finish and Close"**

### Step 1.4: Get Your Connection String

1. Click **"Go to Database"** or navigate to **Database** in left sidebar
2. Click **"Connect"** button
3. Choose **"Drivers"** (not Compass or Shell)
4. Select: Driver **"Node.js"** and Version **"4.1 or later"**
5. Copy the connection string - looks like:
   ```
   mongodb+srv://propertyuser:<password>@clusterX.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password from Step 1.2
7. Add your database name before the `?`:
   ```
   mongodb+srv://propertyuser:YourPassword@clusterX.xxxxx.mongodb.net/propertyrentals?retryWrites=true&w=majority
   ```
8. **Save this complete connection string** - you'll need it soon!

---

## Part 2: Prepare Your GitHub Repository

### Step 2.1: Verify render.yaml Configuration

Your project already includes a `render.yaml` file for easy deployment. Let's verify it's ready:

```bash
cat render.yaml
```

The file should define both frontend and backend services. If it's missing or incomplete, create it:

```yaml
services:
  # Backend API Server
  - type: web
    name: property-rental-api
    env: node
    region: oregon
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: MONGO_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false

  # Frontend Client
  - type: web
    name: property-rental-client
    env: static
    region: oregon
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: ./client/dist
    envVars:
      - key: VITE_API_URL
        sync: false
```

### Step 2.2: Push to GitHub

If you haven't already pushed your code to GitHub:

```bash
# Navigate to your project directory
cd /Users/cross/Desktop/property-rental-platform

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Property Rental Platform"

# Create a new repository on GitHub (via browser)
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/property-rental-platform.git
git branch -M main
git push -u origin main
```

**Important**: Your repository must be **public** for Render's free tier.

---

## Part 3: Deploy Backend API to Render

### Step 3.1: Create Render Account

1. Go to [Render.com](https://render.com/)
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended - easier integration)
4. Authorize Render to access your GitHub repositories

### Step 3.2: Create Backend Web Service

1. From Render Dashboard, click **"New +"** → **"Web Service"**
2. Click **"Build and deploy from a Git repository"** → **"Next"**
3. Find and select your `property-rental-platform` repository
   - If you don't see it, click "Configure account" to grant access
4. Click **"Connect"**

5. Configure the service:

   **Basic Settings:**
   - **Name**: `property-rental-api` (or your choice - this will be in your URL)
   - **Region**: Oregon (US West) - cheapest/fastest
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`

   **Instance Type:**
   - Select **"Free"** ($0/month)

6. **Add Environment Variables** (click "Advanced" if needed):

   Click **"Add Environment Variable"** for each:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `MONGO_URL` | Your MongoDB connection string from Part 1 Step 1.4 |
   | `JWT_SECRET` | Generate secure secret (see below) |
   | `JWT_REFRESH_SECRET` | Generate another secure secret (see below) |

   **To generate JWT secrets**, run these commands in your terminal:
   ```bash
   # For JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # For JWT_REFRESH_SECRET  
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
   Copy the output and paste as environment variable values.

7. Click **"Create Web Service"**

8. Wait 3-5 minutes for deployment to complete
   - You'll see the build logs in real-time
   - Status will show "Live" when ready

9. **Save your API URL!** It will look like:
   ```
   https://property-rental-api.onrender.com
   ```
   Or whatever name you chose.

---

## Part 4: Deploy Frontend to Render

### Step 4.1: Create Static Site

1. From Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect your `property-rental-platform` repository again
3. Click **"Connect"**

4. Configure the static site:

   **Basic Settings:**
   - **Name**: `property-rental-client` (or your choice)
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/dist`

5. **Add Environment Variable**:

   Click **"Advanced"** → **"Add Environment Variable"**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://YOUR-API-NAME.onrender.com/api` |
   
   **Important**: Use YOUR actual backend API URL from Part 3, Step 3.2.9, and add `/api` at the end.

6. Click **"Create Static Site"**

7. Wait 3-5 minutes for build and deployment
   - Status will show "Live" when ready

8. **🎉 Your app is now live!** The URL will be:
   ```
   https://property-rental-client.onrender.com
   ```

---

## Part 5: Alternative Deployment (Using Blueprint)

If you want to deploy both services at once using the `render.yaml` file:

1. From Render Dashboard, click **"New +"** → **"Blueprint"**
2. Connect your repository
3. Render will detect the `render.yaml` file
4. Review the services it will create (backend + frontend)
5. Click **"Apply"**
6. **Manually add environment variables** for each service:
   - Go to each service → Settings → Environment
   - Add the variables from Parts 3 and 4 above
7. Both services will deploy automatically

---

## 🎯 Post-Deployment Steps

### Verify Your Deployment

1. **Test Backend API**:
   ```bash
   curl https://YOUR-API-URL.onrender.com/api/health
   ```
   Should return a health check response.

2. **Test Frontend**:
   - Visit your frontend URL in browser
   - Try registering a new account
   - Try logging in
   - Upload a test property

### Configure CORS (if needed)

If you get CORS errors, verify your backend's `server/index.js` allows your frontend domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://YOUR-FRONTEND-URL.onrender.com'
  ],
  credentials: true
}));
```

---

## 🎨 Customize Your URLs

### Option A: Customize Render Subdomain (Free)

1. Go to service → **Settings** → **General**
2. Change the **Name** field
3. Your new URL: `https://new-name.onrender.com`
4. Update CORS settings and environment variables accordingly

### Option B: Use Custom Domain (Requires Domain Purchase)

1. Buy a domain from Namecheap, GoDaddy, etc. (~$10-15/year)
2. In Render dashboard → Your service → **Settings** → **Custom Domain**
3. Click **"Add Custom Domain"**
4. Enter your domain: `www.mypropertyapp.com`
5. Render provides DNS records (CNAME or A records)
6. Add these records in your domain registrar's DNS settings
7. Wait 5-60 minutes for DNS propagation
8. Render will automatically provision SSL certificate

---

## ⚙️ Important Free Tier Limitations

### Backend Service Sleeping
- **Issue**: Free services "spin down" after 15 minutes of inactivity
- **Impact**: First request after sleep takes 30-50 seconds to wake up
- **Solutions**:
  1. **Use UptimeRobot** (free):
     - Sign up at [uptimerobot.com](https://uptimerobot.com)
     - Add HTTP(s) monitor for your backend URL
     - Set check interval to 5-10 minutes
     - Keeps your service awake during active hours
  
  2. **Upgrade to Paid** ($7/month):
     - Always-on service
     - No spin-down
     - Better performance

### Disk Storage
- **Free Tier**: Ephemeral storage (resets on each deploy)
- **Impact**: Uploaded images stored in `server/public/uploads/` will be lost
- **Solution**: Use cloud storage:
  - **Cloudinary** (free tier: 25GB storage, 25GB bandwidth/month)
  - **AWS S3** (free tier: 5GB storage, 20,000 GET requests)
  - **Imgur API** (free with rate limits)

### Monthly Limits
- **750 hours/month** of runtime (enough for 1 service running 24/7)
- **100 GB bandwidth/month**
- Perfect for development/demo, may need upgrade for production

---

## 🐛 Troubleshooting

### Backend Won't Start

**Symptoms**: Service shows "Deploy failed" or crashes immediately

**Solutions**:
1. Check build logs in Render dashboard
2. Verify `MONGO_URL` is correct and includes database name
3. Verify all environment variables are set
4. Check that `server/package.json` has correct start script:
   ```json
   "scripts": {
     "start": "node index.js"
   }
   ```

### Frontend Shows API Errors

**Symptoms**: "Network Error" or "Failed to fetch" in browser console

**Solutions**:
1. Verify `VITE_API_URL` includes `/api` at the end
2. Check backend is running (visit API URL in browser)
3. Open browser DevTools → Network tab → Check request URLs
4. Verify CORS is configured correctly in backend

### Images Won't Upload

**Symptoms**: Error when uploading property photos

**Solutions**:
1. Check file size limits (Render has memory constraints)
2. Implement Cloudinary integration (recommended for production)
3. Check `multer` configuration in `server/utils/fileUpload.js`

### Database Connection Errors

**Symptoms**: "MongoNetworkError" or "Authentication failed"

**Solutions**:
1. Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
2. Check connection string has correct password (no special characters need encoding)
3. Verify database user has correct permissions
4. Test connection string locally first

### Environment Variables Not Working

**Symptoms**: `undefined` values for env vars

**Solutions**:
1. Go to Render Dashboard → Your Service → **Environment**
2. Verify all variables are present
3. Click **"Manual Deploy"** → **"Clear build cache & deploy"**
4. For frontend, ensure variables start with `VITE_`

---

## 📊 Monitoring Your Deployment

### View Logs

1. Go to Render Dashboard → Your Service
2. Click **"Logs"** tab
3. Filter by severity (Info, Warning, Error)
4. Use search to find specific errors

### Monitor Performance

1. Go to Render Dashboard → Your Service
2. Click **"Metrics"** tab
3. View:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

### Set Up Alerts

1. Go to Service → **Settings** → **Alerts**
2. Add email notifications for:
   - Deploy failures
   - Service crashes
   - High memory usage

---

## 🚀 Going to Production

When you're ready to handle real users:

### 1. Upgrade Render Services ($7-25/month each)
- Always-on (no sleeping)
- Better performance
- More memory/CPU
- Persistent disk storage

### 2. Upgrade MongoDB Atlas ($9-57/month)
- Better performance
- Automated backups
- Point-in-time recovery
- Advanced monitoring

### 3. Add Image CDN
- Implement Cloudinary or AWS S3
- Faster image delivery
- No storage limits

### 4. Add Redis Caching ($10/month)
- Cache frequent database queries
- Faster response times
- Reduce database load

### 5. Use Custom Domain
- Professional appearance
- Better SEO
- Brand recognition

### 6. Set Up CI/CD
- Automatic deployments on git push
- Run tests before deploy
- Staged environments (dev/staging/prod)

---

## 💰 Cost Breakdown

### Free Tier (Development/Demo)
- MongoDB Atlas: **$0/month** (M0 cluster)
- Render Backend: **$0/month** (with limitations)
- Render Frontend: **$0/month**
- **Total: $0/month** ✅

### Production Tier (Real Users)
- MongoDB Atlas: **$9/month** (M2 cluster)
- Render Backend: **$7/month** (Starter)
- Render Frontend: **$0/month** (static sites always free!)
- Cloudinary: **$0/month** (free tier sufficient for small apps)
- Domain: **$12/year** (~$1/month)
- **Total: ~$17/month** 💰

---

## 🔗 Useful Links

- **Render Documentation**: https://render.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Render Community**: https://community.render.com/
- **Status Page**: https://status.render.com/

---

## 🆘 Getting Help

### Common Resources
1. Check Render build/runtime logs first
2. Search Render Community forums
3. Check MongoDB Atlas metrics and logs
4. Use browser DevTools → Console/Network tabs

### Support Channels
- **Render Support**: support@render.com (for technical issues)
- **MongoDB Support**: https://support.mongodb.com/
- **Project Issues**: File an issue on your GitHub repository

---

## ✅ Deployment Checklist

Use this checklist to ensure everything is configured correctly:

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with strong password
- [ ] Network access configured (0.0.0.0/0 whitelisted)
- [ ] Connection string saved and tested
- [ ] Code pushed to public GitHub repository
- [ ] Backend service created on Render
- [ ] All backend environment variables set (5 total)
- [ ] Backend service shows "Live" status
- [ ] Backend API URL saved
- [ ] Frontend static site created on Render
- [ ] Frontend environment variable set (VITE_API_URL)
- [ ] Frontend service shows "Live" status
- [ ] Tested user registration
- [ ] Tested login
- [ ] Tested property creation
- [ ] Tested property browsing
- [ ] (Optional) UptimeRobot configured to prevent sleeping
- [ ] (Optional) Custom domain configured

---

## 🎉 Congratulations!

Your property rental platform is now live on the internet! Share your URL with friends, add it to your portfolio, and start building your user base.

**Next Steps:**
1. Add more properties to showcase features
2. Invite friends to test the platform
3. Monitor usage and performance
4. Consider upgrades as you grow
5. Add new features based on user feedback

Happy deploying! 🚀🏠
