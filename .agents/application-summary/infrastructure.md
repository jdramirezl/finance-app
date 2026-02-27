# Infrastructure and Deployment

## Deployment Architecture

Finance App uses a serverless architecture deployed on free-tier cloud services:

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Static Assets (HTML, CSS, JS)                     │ │
│  │  - React SPA                                       │ │
│  │  - Vite build output                               │ │
│  │  - CDN distribution                                │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Serverless Functions                              │ │
│  │  - /api/exchange-rates.ts                          │ │
│  │  - /api/stock-price.ts                             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase (Backend + DB)                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                               │ │
│  │  - User data with RLS                              │ │
│  │  - Automatic backups                               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Authentication Service                            │ │
│  │  - Email/password auth                             │ │
│  │  - JWT token management                            │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Layer                                         │ │
│  │  - Auto-generated REST API                         │ │
│  │  - Real-time subscriptions                         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Hosting Platforms

### Vercel (Frontend Hosting)

**Service**: Vercel Free Tier

**What's Deployed**:
- React SPA (static build output from Vite)
- Serverless API functions for external integrations
- Static assets (images, fonts, etc.)

**Features Used**:
- **Automatic deployments**: Triggered on git push to main branch
- **Preview deployments**: For pull requests
- **CDN distribution**: Global edge network for fast loading
- **HTTPS**: Automatic SSL certificates
- **Environment variables**: Secure configuration management

**Configuration**: `frontend/vercel.json`

**Deployment URL**: Configured via Vercel dashboard

**Build Command**: `npm run build`

**Output Directory**: `dist/`

### Supabase (Backend + Database)

**Service**: Supabase Free Tier

**What's Deployed**:
- PostgreSQL database (500 MB storage)
- Authentication service
- Auto-generated REST API
- Row Level Security policies

**Features Used**:
- **Database**: PostgreSQL 15+ with full SQL support
- **Authentication**: Email/password with JWT tokens
- **Row Level Security**: Automatic data isolation per user
- **Automatic backups**: Daily backups included
- **API**: Auto-generated REST and GraphQL APIs
- **Real-time**: WebSocket subscriptions (not currently used)

**Configuration**: Environment variables in frontend

**Database Migrations**: Located in `backend/migrations/`

**Connection**: Via Supabase JavaScript client library

## Environment Configuration

### Frontend Environment Variables

Required for deployment:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Optional: API Keys for external services
VITE_EXCHANGE_RATE_API_KEY=[key]
VITE_STOCK_API_KEY=[key]
```

**Storage**: Configured in Vercel dashboard

**Access**: Available at build time and runtime via `import.meta.env`

### Backend Environment Variables

Required for backend operations:

```bash
# Supabase Configuration
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=[service-key]

# Database Connection
DATABASE_URL=postgresql://[connection-string]
```

**Storage**: Configured in Supabase dashboard or backend hosting

## Database Schema

### Tables

**users** (managed by Supabase Auth):
- id (UUID, primary key)
- email
- encrypted_password
- created_at
- updated_at

**accounts**:
- id (UUID, primary key)
- user_id (FK to users)
- name
- color
- currency
- created_at
- updated_at

**pockets**:
- id (UUID, primary key)
- account_id (FK to accounts)
- name
- type ('normal' | 'fixed')
- created_at
- updated_at

**sub_pockets**:
- id (UUID, primary key)
- pocket_id (FK to pockets)
- name
- value_total
- periodicity_months
- balance
- enabled
- created_at
- updated_at

**movements**:
- id (UUID, primary key)
- user_id (FK to users)
- account_id (FK to accounts)
- pocket_id (FK to pockets)
- sub_pocket_id (FK to sub_pockets, nullable)
- type
- amount
- notes
- displayed_date
- is_pending
- created_at
- updated_at

**movement_templates**:
- id (UUID, primary key)
- user_id (FK to users)
- name
- type
- account_id (FK to accounts)
- pocket_id (FK to pockets)
- default_amount (nullable)
- notes (nullable)
- created_at
- updated_at

**reminders**:
- id (UUID, primary key)
- user_id (FK to users)
- title
- amount
- due_date
- recurrence
- enabled
- created_at
- updated_at

**net_worth_snapshots**:
- id (UUID, primary key)
- user_id (FK to users)
- date
- total_value
- currency_breakdown (JSONB)
- created_at

**settings**:
- id (UUID, primary key)
- user_id (FK to users)
- primary_currency
- snapshot_frequency
- theme
- created_at
- updated_at

### Row Level Security Policies

All tables have RLS policies that ensure:
- Users can only read their own data
- Users can only insert/update/delete their own data
- Policies use `auth.uid()` to filter by authenticated user

Example policy:
```sql
CREATE POLICY "Users can only access their own accounts"
ON accounts
FOR ALL
USING (user_id = auth.uid());
```

## Deployment Regions

### Vercel
- **Global CDN**: Content distributed to edge locations worldwide
- **Primary Region**: Configurable (typically US East or West)
- **Latency**: <100ms for most users globally

### Supabase
- **Database Region**: Selected during project creation (e.g., US East, EU West)
- **Single Region**: Free tier limited to one region
- **Latency**: Varies by user location relative to database region

## Deployment Process

### Automated Deployment (Recommended)

**Frontend**:
1. Push code to GitHub main branch
2. Vercel automatically detects changes
3. Runs build process (`npm run build`)
4. Deploys to production
5. Updates DNS and CDN

**Backend/Database**:
1. Database migrations run manually via Supabase dashboard or CLI
2. Schema changes applied to production database
3. RLS policies updated as needed

### Manual Deployment

**Frontend**:
```bash
# Build locally
npm run build

# Deploy via Vercel CLI
vercel --prod
```

**Database Migrations**:
```bash
# Connect to Supabase
supabase link --project-ref [project-id]

# Run migrations
supabase db push
```

## Monitoring and Observability

### Vercel Analytics
- **Page views**: Track user traffic
- **Performance**: Core Web Vitals monitoring
- **Errors**: Runtime error tracking
- **Build logs**: Deployment success/failure logs

**Access**: Vercel dashboard

### Supabase Dashboard
- **Database metrics**: Connection count, query performance
- **Auth metrics**: User signups, login attempts
- **API usage**: Request count, response times
- **Storage usage**: Database size, backup status

**Access**: Supabase project dashboard

### Application Logging
- **Frontend**: Console logs (development only)
- **Backend**: Server logs via hosting platform
- **Errors**: Captured by TanStack Query error boundaries

## Backup and Recovery

### Database Backups
- **Frequency**: Daily automatic backups (Supabase free tier)
- **Retention**: 7 days
- **Recovery**: Via Supabase dashboard
- **Point-in-time recovery**: Not available on free tier

### Code Backups
- **Version control**: Git repository on GitHub
- **Deployment history**: Vercel maintains deployment history
- **Rollback**: Can redeploy previous versions via Vercel

## Security Measures

### Network Security
- **HTTPS Only**: All traffic encrypted with TLS 1.3
- **CORS**: Configured to allow only frontend domain
- **Rate Limiting**: Supabase provides basic rate limiting

### Authentication Security
- **Password Hashing**: Bcrypt via Supabase Auth
- **JWT Tokens**: Short-lived access tokens
- **Refresh Tokens**: Secure token rotation
- **Session Management**: Automatic session expiry

### Database Security
- **Row Level Security**: Enforced at database level
- **Prepared Statements**: Protection against SQL injection
- **Encrypted Connections**: All database connections encrypted
- **No Direct Access**: Database not publicly accessible

### Application Security
- **Input Validation**: Client and server-side validation
- **XSS Protection**: React's built-in escaping
- **CSRF Protection**: Token-based authentication
- **Dependency Scanning**: Regular npm audit checks

## Cost Structure

### Current Costs: $0/month

**Vercel Free Tier**:
- 100 GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- Preview deployments

**Supabase Free Tier**:
- 500 MB database storage
- 2 GB file storage
- 50,000 monthly active users
- 500 MB egress

### Scaling Costs (Future)

**Vercel Pro** ($20/month):
- 1 TB bandwidth
- Advanced analytics
- Team collaboration

**Supabase Pro** ($25/month):
- 8 GB database storage
- 100 GB file storage
- Daily backups
- Point-in-time recovery

## Disaster Recovery

### Recovery Time Objective (RTO)
- **Frontend**: <5 minutes (redeploy from git)
- **Database**: <1 hour (restore from backup)

### Recovery Point Objective (RPO)
- **Frontend**: 0 (stateless, no data loss)
- **Database**: 24 hours (daily backups)

### Disaster Scenarios

**Frontend Outage**:
1. Vercel automatically handles failover
2. CDN serves cached content
3. Manual redeploy if needed

**Database Outage**:
1. Supabase handles infrastructure issues
2. Restore from latest backup if needed
3. Users may lose up to 24 hours of data

**Complete Data Loss**:
1. Restore database from Supabase backup
2. Redeploy frontend from git
3. Verify data integrity
4. Communicate with users

## Performance Benchmarks

### Frontend Performance
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Lighthouse Score**: 90+ (Performance)

### API Performance
- **Average Response Time**: <200ms
- **P95 Response Time**: <500ms
- **Uptime**: 99.9% (Vercel + Supabase SLA)

### Database Performance
- **Query Time**: <50ms (simple queries)
- **Connection Pool**: Managed by Supabase
- **Concurrent Connections**: Limited by free tier

## Future Infrastructure Improvements

### Planned Enhancements
- **Caching Layer**: Redis for frequently accessed data
- **CDN Optimization**: Image optimization and lazy loading
- **Database Optimization**: Query optimization and indexing
- **Monitoring**: Enhanced error tracking (e.g., Sentry)
- **CI/CD**: Automated testing before deployment
- **Multi-Region**: Deploy to multiple regions for lower latency
