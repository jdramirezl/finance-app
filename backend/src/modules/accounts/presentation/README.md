# Account Controller Integration Tests

## Overview

The `AccountController.integration.test.ts` file contains comprehensive integration tests for all account controller endpoints. These tests verify the complete HTTP request/response flow, including authentication, validation, and error handling.

## Test Coverage

### POST /api/accounts - Create Account
- ✅ Create normal account successfully
- ✅ Create investment account with stock symbol
- ✅ Validation errors (empty name, invalid color)
- ✅ Duplicate account conflict (same name + currency)
- ✅ Unauthorized access (no token)

### GET /api/accounts - Get All Accounts
- ✅ Return all accounts for authenticated user
- ✅ Return empty array when no accounts exist
- ✅ Return accounts sorted by display order
- ✅ Unauthorized access (no token)

### GET /api/accounts/:id - Get Account By ID
- ✅ Return account by ID for authenticated user
- ✅ Not found error (non-existent account)
- ✅ Forbidden access (another user's account)
- ✅ Unauthorized access (no token)

### PUT /api/accounts/:id - Update Account
- ✅ Update account name successfully
- ✅ Update account color successfully
- ✅ Update account currency successfully
- ✅ Validation errors (invalid color)
- ✅ Conflict error (duplicate name + currency)
- ✅ Not found error (non-existent account)

### DELETE /api/accounts/:id - Delete Account
- ✅ Delete account successfully when no pockets exist
- ✅ Conflict error when account has pockets
- ✅ Not found error (non-existent account)

### POST /api/accounts/:id/cascade - Cascade Delete
- ✅ Cascade delete with orphan flag (deleteMovements=false)
- ✅ Cascade delete with hard delete flag (deleteMovements=true)
- ✅ Cascade delete with fixed pocket and sub-pockets
- ✅ Not found error (non-existent account)

### POST /api/accounts/reorder - Reorder Accounts
- ✅ Reorder accounts successfully
- ✅ Validation error (empty accountIds)
- ✅ Not found error (non-existent account)
- ✅ Forbidden error (accounts from different users)

## Prerequisites

To run these integration tests, you need:

1. **Supabase Instance**: A Supabase project with the accounts table schema
2. **Environment Variables**: Set in `backend/.env`:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

## Running the Tests

### Run all integration tests:
```bash
cd backend
npm test -- AccountController.integration.test.ts
```

### Run with coverage:
```bash
cd backend
npm test -- AccountController.integration.test.ts --coverage
```

### Skip integration tests:
If environment variables are not set, the tests will automatically be skipped with a message:
```
SKIP  src/modules/accounts/presentation/AccountController.integration.test.ts
  ● skipped 1 suite
```

## Test Architecture

### Authentication
- Tests create a real Supabase Auth user for each test run
- JWT tokens are obtained through actual sign-in
- Tests clean up the test user after completion

### Data Isolation
- Each test run uses a unique test user ID
- All test data is cleaned up after each test
- Tests do not interfere with each other

### Mock Dependencies
- `MockPocketRepository` is registered for testing account deletion
- Full PocketRepository will be implemented in Phase 2

## Troubleshooting

### Tests are skipped
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in `backend/.env`
- Verify the Supabase instance is accessible

### Authentication errors
- Verify the service key has admin privileges
- Check that the Supabase Auth service is enabled

### Database errors
- Ensure the accounts table exists with the correct schema
- Verify RLS policies allow service key access

## Future Improvements

- Add performance benchmarks for each endpoint
- Add load testing for concurrent requests
- Add tests for rate limiting (when implemented)
- Add tests for API documentation endpoints (when implemented)
