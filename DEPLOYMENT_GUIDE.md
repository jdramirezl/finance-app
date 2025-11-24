# 🚀 Deployment Guide - Finance App

Complete guide to deploy your finance app with Supabase + Vercel (100% FREE)

---

## 📋 Prerequisites

- GitHub account
- Supabase account (free)
- Vercel account (free)
- Your code pushed to GitHub

---

## PART 1: Supabase Setup (10 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Click **"New project"**
5. Fill in:
   - **Organization:** Create new or select existing
   - **Name:** `finance-app` (or your choice)
   - **Database Password:** Create a strong password (SAVE THIS!)
   - **Region:** Choose closest to you (e.g., US West, Europe West)
   - **Pricing Plan:** Free (default)
6. Click **"Create new project"**
7. ⏳ Wait 2-3 minutes for project to initialize

### Step 2: Run Database Schema

1. In your Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from your project
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. ✅ You should see "Success. No rows returned"

This creates all your tables (accounts, pockets, movements, etc.) with proper security!

### Step 3: Get Your API Keys

1. Go to **Settings** (gear icon in sidebar) → **API**
2. Find and copy these two values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon public key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
   ```

3. 📝 Save these somewhere safe (you'll need them in Step 5)

### Step 4: Configure Email Settings (Optional but Recommended)

By default, Supabase sends confirmation emails. For testing, you can disable this:

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle **"Confirm email"** to OFF (for testing only)
3. Click **"Save"**

**For production:** Keep email confirmation ON and configure a custom SMTP provider.

---

## PART 2: Local Setup (5 minutes)

### Step 5: Add Environment Variables

1. In your project root, you should see a `.env` file
2. Open it and replace with your actual Supabase values:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file

### Step 6: Test Locally

```bash
# Install dependencies (if you haven't)
npm install

# Run the app
npm run dev
```

1. Open http://localhost:5173
2. Click **"Sign up"**
3. Create a test account
4. ✅ If you can sign up and log in, it's working!

---

## PART 3: GitHub Setup (5 minutes)

### Step 7: Push to GitHub

If you haven't already:

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Add Supabase authentication and deployment setup"

# Create GitHub repo (go to github.com/new)
# Then connect and push:
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finance-app.git
git push -u origin main
```

**Important:** Make sure `.env` is in your `.gitignore` (it should be by default)

---

## PART 4: Vercel Deployment (5 minutes)

### Step 8: Deploy to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** → Sign up with GitHub
3. Click **"Add New..."** → **"Project"**
4. Find your `finance-app` repository
5. Click **"Import"**

### Step 9: Configure Environment Variables

Before deploying, add your Supabase credentials:

1. In the **"Configure Project"** screen, expand **"Environment Variables"**
2. Add these two variables:

   **Variable 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://xxxxxxxxxxxxx.supabase.co` (your Supabase URL)

   **Variable 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key)

3. Click **"Deploy"**

### Step 10: Wait for Deployment

⏳ Vercel will:
- Install dependencies
- Build your app
- Deploy to production

This takes 1-2 minutes. You'll see a confetti animation when done! 🎉

### Step 11: Visit Your App

1. Click **"Visit"** or copy the URL (looks like: `https://finance-app-xxxxx.vercel.app`)
2. Open it in your browser
3. ✅ You should see the login page!

---

## 🎉 You're Live!

Your app is now deployed and accessible from anywhere!

**Your URL:** `https://finance-app-xxxxx.vercel.app`

### What You Have Now:

✅ **Secure authentication** - Each user has their own account
✅ **Cloud database** - Data stored safely in Supabase
✅ **Multi-device sync** - Access from phone, laptop, tablet
✅ **Automatic backups** - Supabase backs up daily
✅ **Free hosting** - Both Vercel and Supabase free tiers
✅ **Auto-deploy** - Push to GitHub = automatic deployment

---

## 👥 Adding Users (Your Friends)

To add your 2 friends:

1. Share your app URL: `https://finance-app-xxxxx.vercel.app`
2. They click **"Sign up"**
3. They create their own account
4. ✅ Each person has completely separate finances!

**Security:** Row Level Security ensures users can ONLY see their own data.

---

## 🔄 Making Updates

Whenever you want to add features or fix bugs:

```bash
# Make your changes
# Then commit and push
git add .
git commit -m "Add new feature"
git push
```

Vercel automatically detects the push and redeploys! 🚀

---

## 🆓 Cost Breakdown

**Supabase Free Tier:**
- ✅ 500MB database (you'll use ~5MB)
- ✅ 50,000 monthly active users (you have 3)
- ✅ 2GB bandwidth (plenty)
- ✅ Daily backups
- ⚠️ Pauses after 1 week of inactivity (just visit once a week)

**Vercel Free Tier:**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Preview deployments

**Total Cost: $0/month** 💰

---

## 🔧 Troubleshooting

### "Invalid API key" error
- Check your `.env` file has correct values
- Make sure environment variables are set in Vercel
- Redeploy after adding environment variables

### "Email not confirmed" error
- Go to Supabase → Authentication → Users
- Find the user and click "..." → "Confirm email"
- Or disable email confirmation (see Step 4)

### Can't sign up
- Check Supabase SQL Editor for errors
- Make sure you ran the entire `supabase-schema.sql` file
- Check browser console for errors

### Data not syncing
- Check browser console for errors
- Verify Supabase URL and key are correct
- Check Supabase → Table Editor to see if data is there

### Vercel build fails
- Check build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Try building locally first: `npm run build`

---

## 🎯 Next Steps

### Optional Improvements:

1. **Custom Domain**
   - Buy a domain (e.g., `myfinances.com`)
   - Add it in Vercel → Settings → Domains
   - Free SSL included!

2. **Email Confirmation**
   - Configure custom SMTP in Supabase
   - Use SendGrid, Mailgun, or Gmail

3. **Social Login**
   - Add Google/GitHub login in Supabase
   - Update auth pages to include social buttons

4. **Mobile App**
   - Use React Native with same Supabase backend
   - Share all business logic!

---

## 📞 Need Help?

If you get stuck:
1. Check Supabase docs: https://supabase.com/docs
2. Check Vercel docs: https://vercel.com/docs
3. Check browser console for errors
4. Check Supabase logs: Dashboard → Logs

---

## ✅ Checklist

Before going live, verify:

- [ ] Supabase project created
- [ ] Database schema executed successfully
- [ ] Environment variables set locally
- [ ] App works locally (can sign up/login)
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] App deployed successfully
- [ ] Can access app via Vercel URL
- [ ] Can sign up and login on production
- [ ] Data persists after refresh
- [ ] Friends can create their own accounts

---

🎉 **Congratulations!** Your finance app is live and ready to use!
