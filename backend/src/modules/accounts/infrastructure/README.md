# Account Repository Integration Tests

## Overview

The `SupabaseAccountRepository.integration.test.ts` file contains integration tests that verify the repository's interaction with a real Supabase database. These tests are different from unit tests because they:

- Connect to an actual database
- Perform real CRUD operations
- Test data persistence and retrieval
- Verify database constraints and behavior

## Running Integration Tests

### Prerequisites

1. **Supabase Instance**: You need access to a Supabase project (can be a test/development instance)
2. **Environment Variables**: Set the following in your `.env` file:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   ```

3. **Database Schema**: Ensure the `accounts` table exists with the proper schema (see `sql/supabase-schema.sql`)

### Running the Tests

```bash
# Run all tests (integration tests will be skipped if env vars not set)
npm test

# Run only integration tests
npm test -- SupabaseAccountRepository.integration.test.ts

# Run with coverage
npm test -- --coverage SupabaseAccountRepository.integration.test.ts
```

### Test Behavior

- **Without Environment Variables**: Tests are automatically skipped with a clear message
- **With Environment Variables**: Tests run against the real database
- **Test Isolation**: Each test uses a unique user ID to avoid conflicts
- **Cleanup**: All test data is automatically cleaned up after each test

## Test Coverage

The integration tests cover:

### Save Operation
- ✅ Save normal accounts
- ✅ Save investment accounts with all fields
- ✅ Handle duplicate ID errors

### Find By ID Operation
- ✅ Find existing accounts
- ✅ Return null for non-existent accounts
- ✅ Respect user ownership (multi-tenancy)

### Find All By User ID Operation
- ✅ Return empty array for users with no accounts
- ✅ Return all accounts for a user
- ✅ Sort by display order (ascending)
- ✅ Place null display orders last
- ✅ Filter by user ID (multi-tenancy)

### Exists By Name And Currency Operation
- ✅ Return true when account exists
- ✅ Return false when account doesn't exist
- ✅ Check both name and currency (not just one)
- ✅ Case-sensitive name matching
- ✅ Respect user ownership

### Update Operation
- ✅ Update account name
- ✅ Update account color
- ✅ Update account currency
- ✅ Update account balance
- ✅ Update investment account fields
- ✅ Update display order
- ✅ Respect user ownership

### Delete Operation
- ✅ Delete existing accounts
- ✅ Handle non-existent accounts gracefully
- ✅ Respect user ownership
- ✅ Allow re-creating accounts with same ID

## Best Practices

1. **Use Test Database**: Never run integration tests against production
2. **Unique Test Data**: Tests use unique IDs to avoid conflicts
3. **Cleanup**: Always clean up test data in `afterEach`
4. **Isolation**: Each test should be independent
5. **Environment Check**: Tests skip gracefully when env vars missing

## Troubleshooting

### Tests Are Skipped
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in `.env`
- Verify the `.env` file is in the `backend/` directory

### Connection Errors
- Verify Supabase URL is correct
- Check that service key has proper permissions
- Ensure network connectivity to Supabase

### Schema Errors
- Run the schema migration: `sql/supabase-schema.sql`
- Verify the `accounts` table exists
- Check that all columns match the expected schema

### Test Failures
- Check database state (may have leftover data)
- Verify Supabase RLS policies allow service key access
- Review error messages for specific issues
