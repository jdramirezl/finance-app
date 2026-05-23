# Task: Add Error Boundaries, Loading States, and Error Feedback

## Description
The app has zero error boundaries (any render crash = white screen), inconsistent loading states, and mutations that fail silently. Fix all three systematically.

## Technical Requirements

### Error Boundaries
1. Create `frontend/src/components/ErrorBoundary.tsx` — a reusable error boundary with:
   - Fallback UI showing "Something went wrong" with a "Try Again" button
   - `onReset` callback that clears the error and re-renders children
   - Optional `fallback` prop for custom fallback UI
2. Wrap each route in App.tsx with an ErrorBoundary
3. Wrap the Layout's `{children}` with an ErrorBoundary (so nav stays visible on page crash)

### Loading States
1. Ensure every page shows a proper skeleton/spinner while queries load (check `isLoading` from each query hook)
2. The SummaryPage consolidated total must show a skeleton until ALL data (including exchange rates) is ready — not $0.00
3. Add loading indicators to all mutation buttons (disable + spinner while `isPending`)

### Error Feedback
1. Every mutation hook must have an `onError` callback that shows a toast
2. Check all existing mutation hooks in `frontend/src/hooks/queries/` and `frontend/src/hooks/mutations/` — add `onError` where missing
3. Remove any remaining `catch (err: any)` patterns that swallow errors — errors must always surface to the user

## Acceptance Criteria
1. ErrorBoundary component exists and wraps all routes
2. A component throwing during render shows fallback UI, not white screen
3. Every page shows loading state while data fetches
4. Every mutation shows loading state and error feedback
5. No silent error swallowing anywhere
6. Frontend builds clean
