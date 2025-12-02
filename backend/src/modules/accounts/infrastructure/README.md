# Repository Integration Tests

## Overview

This directory contains integration tests for the repository layer that interact with a **real Supabase database**.

## Why These Tests Exist

While unit tests and mocked integration tests verify business logic, these tests verify:
- ✅ SQL queries are syntactically correct
- ✅ Table and column names match the database schema
- ✅ Database constraints work as expected
- ✅ Row Level Security (RLS) policies function correctly
- ✅ Transactions and concurrency handling work

## Running These Tests

**By default, these tests are SKIPPED** because they require:
1. A Supabase test database
2. Proper environment variables
3. Network connectivity

### To Run Locally:

```bash
# Set up environment variables
export RUN_INTEGRATION_TESTS=true
export SUPABASE_URL=your-test-supabase-url
export SUPABASE_SERVICE_KEY=your-test-service-key

# Run tests
npm test
```

### When to Run:

- ✅ **Before major releases** - Verify database interactions work
- ✅ **In CI/CD pipeline** - Automated testing with test database
- ✅ **After schema changes** - Ensure queries still work
- ❌ **During development** - Too slow, use mocked tests instead

## Alternative: Docker Test Database

For a better developer experience, consider setting up a local test database:

```yaml
# docker-compose.test.yml
services:
  postgres:
    image: supabase/postgres
    environment:
      POSTGRES_PASSWORD: test
    ports:
      - "54322:5432"
```

Then run: `docker-compose -f docker-compose.test.yml up -d`

## Should You Delete These Tests?

**Keep them if:**
- You want confidence that SQL queries work
- You have CI/CD that can run them
- You're working on a production system

**Delete them if:**
- You prefer simpler codebase
- You rely on manual testing
- You're prototyping/learning

For this project, they're kept but skipped by default as a safety net.
