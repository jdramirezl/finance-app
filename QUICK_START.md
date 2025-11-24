# ⚡ Quick Start Guide

Get your finance app deployed in 25 minutes!

## 🎯 What You'll Get

- ✅ Secure multi-user authentication
- ✅ Cloud database (Supabase)
- ✅ Live deployment (Vercel)
- ✅ Multi-device sync
- ✅ **100% FREE**

---

## 📝 What You Need

1. **Supabase Account** - https://supabase.com (sign up with GitHub)
2. **Vercel Account** - https://vercel.com (sign up with GitHub)
3. **GitHub Account** - https://github.com (if you don't have one)

---

## 🚀 Steps

### 1. Create Supabase Project (5 min)

```
1. Go to supabase.com → Sign up
2. Create new project
3. Wait 2-3 minutes for setup
```

### 2. Setup Database (2 min)

```
1. Open Supabase → SQL Editor
2. Copy all code from supabase-schema.sql
3. Paste and click "Run"
```

### 3. Get API Keys (1 min)

```
1. Supabase → Settings → API
2. Copy "Project URL"
3. Copy "anon public key"
```

### 4. Configure Locally (2 min)

```bash
# Edit .env file with your keys:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here

# Test it:
npm install
npm run dev
```

### 5. Push to GitHub (3 min)

```bash
git init
git add .
git commit -m "Initial commit with Supabase"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finance-app.git
git push -u origin main
```

### 6. Deploy to Vercel (5 min)

```
1. Go to vercel.com → Sign up with GitHub
2. Import your finance-app repository
3. Add environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Click "Deploy"
5. Wait 2 minutes
```

### 7. Done! 🎉

```
Visit your app: https://finance-app-xxxxx.vercel.app
Create your account and start tracking finances!
```

---

## 👥 Add Your Friends

Share the URL with your 2 friends:
- They sign up with their email
- Each gets their own private finances
- Data never mixes between users

---

## 🔄 Make Changes

```bash
# Edit code
git add .
git commit -m "Add feature"
git push

# Vercel auto-deploys! ✨
```

---

## 📖 Full Guide

For detailed instructions and troubleshooting, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## ❓ Quick Troubleshooting

**Can't sign up?**
- Check Supabase → Authentication → Providers → Email
- Disable "Confirm email" for testing

**Build fails?**
- Run `npm run build` locally first
- Check for TypeScript errors

**Data not saving?**
- Check browser console for errors
- Verify environment variables in Vercel

---

## 💰 Costs

**$0/month** - Both services have generous free tiers!

- Supabase: 500MB database, 50K users
- Vercel: 100GB bandwidth, unlimited deploys

---

Ready? Let's go! 🚀
