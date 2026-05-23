# Task: Fix apiClient Error Handling (Written for Axios but Uses Fetch)

## Description
The `apiClient.ts` error handler checks for `error.response` and `error.request` (Axios patterns) but the client uses `fetch`. These branches are dead code. Rewrite to properly handle fetch errors and preserve error context.

## Technical Requirements

### Rewrite handleError
The current implementation:
```typescript
private handleError(error: any): never {
  if (error.response) { ... }      // Axios pattern — DEAD CODE with fetch
  else if (error.request) { ... }   // Axios pattern — DEAD CODE with fetch
  else { ... }
}
```

Replace with proper fetch error handling:
```typescript
private handleError(error: unknown, context?: { method: string; path: string }): never {
  if (error instanceof Response) {
    // HTTP error (non-2xx status)
    throw new AppError(error.status, `${context?.method} ${context?.path} failed: ${error.statusText}`);
  }
  if (error instanceof TypeError) {
    // Network error (fetch throws TypeError for network failures)
    throw new AppError(0, 'Network error: unable to reach server');
  }
  if (error instanceof Error) {
    throw error; // Re-throw known errors
  }
  throw new Error(String(error));
}
```

### Create AppError class
Create `frontend/src/utils/AppError.ts`:
```typescript
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}
```

### Fix the response handling in get/post/put/delete methods
Currently the methods may not properly check `response.ok`. Ensure:
```typescript
const response = await fetch(url, options);
if (!response.ok) {
  const errorBody = await response.json().catch(() => ({}));
  throw new AppError(response.status, errorBody.message || response.statusText);
}
return await response.json();
```

## Acceptance Criteria
1. No `any` types in apiClient.ts
2. Fetch errors (network failures) produce clear error messages
3. HTTP errors (4xx, 5xx) preserve the status code and server message
4. Error context (method, path) is included in error messages
5. Frontend builds clean
