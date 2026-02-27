# Operational Resources

## Development Workflow

### Local Development Setup

**Prerequisites**:
- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)

**Initial Setup**:
```bash
# Clone repository
git clone https://github.com/jdramirezl/finance-app
cd finance-app

# Install dependencies
npm install

# Configure environment variables
# Create .env file in frontend/ with Supabase credentials

# Start development servers
npm run dev:all  # Both frontend and backend
# OR
npm run dev      # Frontend only
npm run dev:backend  # Backend only
```

**Development URLs**:
- Frontend: http://localhost:5173 (Vite default)
- Backend: http://localhost:3000 (if running separately)

### Common Development Tasks

**Running Tests**:
```bash
# Frontend tests
npm run test

# Backend tests
npm run test:backend

# Watch mode
npm run test -- --watch
```

**Linting and Formatting**:
```bash
# Lint code
npm run lint

# Format code (if configured)
npm run format
```

**Building for Production**:
```bash
# Build frontend
npm run build

# Build backend
npm run build:backend

# Build both
npm run build:all
```

## Deployment Procedures

### Frontend Deployment (Vercel)

**Automatic Deployment**:
1. Push changes to `main` branch on GitHub
2. Vercel automatically detects changes
3. Runs build process
4. Deploys to production
5. Deployment URL updated

**Manual Deployment**:
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Rollback**:
1. Go to Vercel dashboard
2. Navigate to Deployments
3. Select previous successful deployment
4. Click "Promote to Production"

### Database Migrations

**Running Migrations**:
```bash
# Connect to Supabase project
supabase link --project-ref [project-id]

# Run pending migrations
supabase db push

# Create new migration
supabase migration new [migration-name]
```

**Migration Files**: Located in `backend/migrations/`

**Migration Naming**: `###_description.sql` (e.g., `001_balance_calculation.sql`)

### Environment Variable Updates

**Vercel**:
1. Go to Vercel dashboard
2. Select project
3. Navigate to Settings > Environment Variables
4. Add/update variables
5. Redeploy for changes to take effect

**Supabase**:
1. Go to Supabase dashboard
2. Select project
3. Navigate to Settings > API
4. Copy updated keys
5. Update in Vercel environment variables

## Monitoring and Alerts

### Application Monitoring

**Vercel Analytics**:
- **Access**: Vercel dashboard > Analytics
- **Metrics**:
  - Page views and unique visitors
  - Core Web Vitals (LCP, FID, CLS)
  - Top pages and referrers
  - Device and browser breakdown

**Supabase Dashboard**:
- **Access**: Supabase dashboard > Reports
- **Metrics**:
  - Database size and growth
  - API requests per day
  - Active users
  - Query performance

### Error Tracking

**Frontend Errors**:
- Captured by TanStack Query error boundaries
- Logged to browser console (development)
- Consider adding Sentry for production error tracking

**Backend Errors**:
- Logged by Express error middleware
- Visible in Vercel function logs
- Database errors logged by Supabase

### Performance Monitoring

**Frontend Performance**:
- Lighthouse CI (can be integrated)
- Vercel Analytics Web Vitals
- Browser DevTools Performance tab

**API Performance**:
- Supabase dashboard query performance
- Vercel function execution time
- TanStack Query DevTools (development)

## Troubleshooting Guide

### Common Issues

**Issue: Build Fails on Vercel**
- **Symptoms**: Deployment fails with build error
- **Diagnosis**: Check Vercel build logs
- **Solutions**:
  - Verify all dependencies are in package.json
  - Check for TypeScript errors
  - Ensure environment variables are set
  - Test build locally: `npm run build`

**Issue: Authentication Not Working**
- **Symptoms**: Users cannot log in or sign up
- **Diagnosis**: Check browser console and network tab
- **Solutions**:
  - Verify Supabase URL and anon key in environment variables
  - Check Supabase dashboard for auth errors
  - Ensure RLS policies are correctly configured
  - Verify JWT token is being sent in requests

**Issue: Database Connection Errors**
- **Symptoms**: API requests fail with database errors
- **Diagnosis**: Check Supabase dashboard logs
- **Solutions**:
  - Verify database is not paused (free tier auto-pauses after inactivity)
  - Check connection string is correct
  - Ensure RLS policies allow the operation
  - Verify user is authenticated

**Issue: Slow Page Load Times**
- **Symptoms**: Pages take long to load
- **Diagnosis**: Use Lighthouse and Network tab
- **Solutions**:
  - Check for large bundle sizes
  - Implement code splitting
  - Optimize images
  - Enable caching for API responses
  - Check database query performance

**Issue: Exchange Rates Not Updating**
- **Symptoms**: Currency conversions show stale data
- **Diagnosis**: Check serverless function logs
- **Solutions**:
  - Verify API key is valid
  - Check rate limit on external API
  - Implement fallback exchange rates
  - Add caching with appropriate TTL

**Issue: Investment Prices Not Loading**
- **Symptoms**: Stock prices show as unavailable
- **Diagnosis**: Check stock price API logs
- **Solutions**:
  - Verify stock symbol is correct
  - Check API key and rate limits
  - Implement fallback to cached prices
  - Add error handling for API failures

## Maintenance Procedures

### Regular Maintenance Tasks

**Weekly**:
- Review Vercel deployment logs
- Check Supabase database size
- Monitor error rates in dashboards
- Review user feedback/issues

**Monthly**:
- Update dependencies: `npm update`
- Run security audit: `npm audit`
- Review and optimize database queries
- Check for unused code and dependencies
- Review and update documentation

**Quarterly**:
- Review and update RLS policies
- Optimize database indexes
- Review and clean up old migrations
- Update external API integrations
- Performance audit and optimization

### Dependency Updates

**Process**:
```bash
# Check for outdated packages
npm outdated

# Update all dependencies
npm update

# Update specific package
npm update [package-name]

# Test after updates
npm run test
npm run build
```

**Best Practices**:
- Update dependencies regularly
- Test thoroughly after updates
- Review breaking changes in changelogs
- Update one major version at a time
- Keep TypeScript and React in sync

### Database Maintenance

**Vacuum and Analyze** (Supabase handles automatically):
- Reclaims storage from deleted rows
- Updates query planner statistics

**Index Maintenance**:
- Review slow queries in Supabase dashboard
- Add indexes for frequently queried columns
- Remove unused indexes

**Data Cleanup**:
- Archive old net worth snapshots (if needed)
- Clean up orphaned records
- Remove test data from production

## Documentation and Runbooks

### Key Documentation

**Project Documentation**:
- `README.md`: Project overview and quick start
- `docs/PROJECT_SPEC.md`: Complete specifications
- `docs/FEATURE_ROADMAP.md`: Planned features
- `docs/qol.md`: Quality of life improvements

**API Documentation**:
- Supabase auto-generated API docs
- Frontend service layer documentation (inline comments)

**Database Documentation**:
- Migration files document schema changes
- RLS policies documented in Supabase dashboard

### Runbooks

**Runbook: Deploy New Feature**
1. Develop feature in feature branch
2. Write tests for new functionality
3. Create pull request
4. Review code changes
5. Merge to main branch
6. Verify automatic deployment succeeds
7. Test feature in production
8. Monitor for errors

**Runbook: Database Migration**
1. Create migration file: `supabase migration new [name]`
2. Write SQL for schema changes
3. Test migration locally
4. Review migration with team
5. Run migration in production: `supabase db push`
6. Verify schema changes
7. Monitor for errors

**Runbook: Rollback Deployment**
1. Identify issue in production
2. Go to Vercel dashboard
3. Find last known good deployment
4. Click "Promote to Production"
5. Verify rollback successful
6. Investigate and fix issue
7. Redeploy when ready

**Runbook: Restore Database Backup**
1. Go to Supabase dashboard
2. Navigate to Database > Backups
3. Select backup to restore
4. Click "Restore"
5. Verify data integrity
6. Communicate with affected users
7. Document incident

## Support and Contact

### Getting Help

**Documentation**:
- Project README and docs/ directory
- Supabase documentation: https://supabase.com/docs
- Vercel documentation: https://vercel.com/docs
- React documentation: https://react.dev

**Community Resources**:
- GitHub Issues: https://github.com/jdramirezl/finance-app/issues
- Supabase Discord: https://discord.supabase.com
- React community forums

**External Services**:
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com

### Reporting Issues

**Bug Reports**:
1. Check existing GitHub issues
2. Create new issue with template
3. Include reproduction steps
4. Attach screenshots/logs
5. Specify environment (browser, OS)

**Feature Requests**:
1. Check feature roadmap
2. Create GitHub issue with "enhancement" label
3. Describe use case and benefits
4. Discuss implementation approach

## Operational Best Practices

### Development Best Practices
- Write tests for new features
- Follow TypeScript strict mode
- Use meaningful commit messages
- Keep pull requests focused and small
- Review code before merging

### Deployment Best Practices
- Test locally before deploying
- Use preview deployments for testing
- Monitor deployments for errors
- Have rollback plan ready
- Communicate changes to users

### Security Best Practices
- Never commit secrets to git
- Use environment variables for sensitive data
- Keep dependencies updated
- Run security audits regularly
- Follow principle of least privilege

### Performance Best Practices
- Optimize images and assets
- Implement code splitting
- Use caching strategically
- Monitor Core Web Vitals
- Optimize database queries

## Future Operational Improvements

### Planned Enhancements
- **CI/CD Pipeline**: Automated testing before deployment
- **Error Tracking**: Integrate Sentry or similar service
- **Monitoring**: Enhanced application monitoring
- **Alerting**: Automated alerts for critical issues
- **Documentation**: API documentation with Swagger/OpenAPI
- **Testing**: Increase test coverage
- **Performance**: Implement performance budgets
