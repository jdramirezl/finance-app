# Deployment Migration Plan

## Current State (Legacy)
- ✅ Vercel: Deploying frontend from root
- ✅ Supabase: Database running
- ❌ Backend: Not deployed (running locally only)

## Target State (New)
- ✅ Vercel: Deploy frontend from `frontend/` directory
- ✅ Vercel: Deploy backend from `backend/` directory (separate project)
- ✅ Supabase: Database (no changes needed)

---

## Step-by-Step Migration

### Phase 1: Deploy Backend to Vercel (10 minutes)

#### 1.1 Create New Vercel Project for Backend
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your `finance-app` repository
4. **Important**: Name it something like `finance-app-backend` (different from frontend)

#### 1.2 Configure Backend Project
1. **Framework Preset**: Other
2. **Root Directory**: `backend`
3. **Build Command**: `npm run build`
4. **Output Directory**: Leave empty (Vercel uses dist/ automatically)
5. **Install Command**: `npm install`

#### 1.3 Add Environment Variables
Before deploying, add these in the project settings:

```
NODE_ENV=production
SUPABASE_URL=<from Supabase dashboard>
SUPABASE_SERVICE_KEY=<from Supabase → Settings → API → service_role key>
SUPABASE_ANON_KEY=<from Supabase → Settings → API → anon public key>
ALPHA_VANTAGE_API_KEY=<your Alpha Vantage API key>
```

**Set for**: Production, Preview, and Development

#### 1.4 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Copy your backend URL (e.g., `https://finance-app-backend.vercel.app`)

#### 1.5 Test Backend Health
Visit: `https://your-backend.vercel.app/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-12-02T..."
}
```

**Note:** First request may take 1-2 seconds (cold start), then it's fast!

---

### Phase 2: Update Vercel Configuration (10 minutes)

#### 2.1 Update Vercel Project Settings
1. Go to Vercel dashboard → Your project
2. Settings → General
3. **Root Directory**: Change from `.` to `frontend`
4. **Framework Preset**: Keep as "Vite"
5. **Build Command**: Keep as `npm run build` (or leave auto-detected)
6. **Output Directory**: Keep as `dist`
7. **Install Command**: Keep as `npm install`
8. Save changes

#### 2.2 Update Environment Variables in Vercel
Go to Settings → Environment Variables:

**Add/Update these:**
```
VITE_API_URL=https://your-backend.vercel.app
VITE_USE_BACKEND=true
VITE_SUPABASE_URL=<your Supabase URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
VITE_ALPHA_VANTAGE_API_KEY=<your Alpha Vantage API key>
```

**Important:** Make sure these are set for all environments (Production, Preview, Development)

#### 2.3 Trigger Redeploy
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait 2-3 minutes

---

### Phase 3: Run Production Database Migrations (5 minutes)

#### 3.1 Fix Group Ownership Issue
In Supabase SQL Editor, run:
```sql
-- From: sql/fix-group-ownership-production.sql
```

This fixes the group visibility issue we discovered locally.

#### 3.2 Verify Migration
Run the verification query at the end of the migration file to confirm all users can see their groups.

---

### Phase 4: Test Production (10 minutes)

#### 4.1 Test Backend
Visit: `https://your-backend.vercel.app/health`
- Should return `{"status": "ok"}`

#### 4.2 Test Frontend
Visit: `https://your-app.vercel.app`
- Should load without errors
- Check browser console for API calls
- Should see: `🔵 Backend API: GET /api/accounts` etc.

#### 4.3 Test Full Flow
1. Log in
2. View accounts (tests backend API)
3. View fixed expenses (tests sub-pockets + groups)
4. Create a movement (tests POST to backend)
5. Check Summary page (tests currency conversion)

#### 4.4 Check for Issues
Common issues:
- **CORS errors**: Backend already configured, should work
- **Cold starts**: First request after inactivity takes 1-2 seconds (Vercel serverless)
- **Environment variables**: Double-check all are set correctly in both projects
- **404 errors**: Make sure VITE_API_URL points to your backend Vercel URL

---

## Rollback Plan (If Needed)

### If Backend Fails:
1. Frontend will automatically fall back to direct Supabase calls
2. Set `VITE_USE_BACKEND=false` in Vercel
3. Redeploy frontend
4. Everything still works (just without backend optimization)

### If Frontend Fails:
1. Revert Vercel Root Directory to `.` (root)
2. Redeploy
3. Old frontend will work (but won't use backend)

---

## Post-Deployment Checklist

- [ ] Backend health endpoint responds
- [ ] Frontend loads without errors
- [ ] Can log in successfully
- [ ] Can view accounts (backend API working)
- [ ] Can create movements (POST working)
- [ ] Can view fixed expenses (groups visible)
- [ ] Currency conversion working
- [ ] Investment prices loading
- [ ] No CORS errors in console
- [ ] Mobile responsive (test on phone)

---

## Free Tier Monitoring

### Vercel Free Tier Limits (Per Project):
**Frontend:**
- 100 GB bandwidth/month
- Unlimited requests
- 6,000 build minutes/month
- 100 GB-hours serverless function execution

**Backend:**
- 100 GB bandwidth/month
- 100 GB-hours serverless function execution/month
- 10 second max function duration
- 1,000 serverless function invocations/day

**Combined (Both Projects):**
- 200 GB total bandwidth
- 200 GB-hours function execution
- Perfect for personal projects!

### Supabase Free Tier Limits:
- 500 MB database
- 2 GB bandwidth/month
- 50,000 monthly active users

### Expected Usage (Personal Finance App):
- **Frontend**: ~1-5 GB bandwidth/month
- **Backend**: ~5-10 GB-hours function execution/month
- **Database**: ~50-100 MB storage

**You'll stay well within all limits!** 📊

**Pro tip:** Vercel's serverless functions are billed by execution time. Your API calls are fast (~50-200ms), so 100 GB-hours = ~500,000-2,000,000 requests/month!

---

## Timeline Summary

- **Phase 1** (Deploy Backend): 10 minutes
- **Phase 2** (Update Vercel): 10 minutes  
- **Phase 3** (Database Migration): 5 minutes
- **Phase 4** (Testing): 10 minutes

**Total: ~35 minutes** to full production deployment! 🚀
