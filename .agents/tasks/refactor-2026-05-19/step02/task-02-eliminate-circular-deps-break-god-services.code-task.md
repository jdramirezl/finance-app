# Task: Eliminate Circular Dependencies and Break Up God-Services

## Description
Services have circular dependencies solved with lazy dynamic imports typed as `any`. `MovementService` is 700+ lines handling 9 different concerns. Break the circular dependency graph by introducing an orchestration layer and splitting god-services into focused modules.

## Background
Current dependency graph:
- `accountService` → imports `pocketService`, `subPocketService`, `movementService`
- `movementService` → imports `pocketService`, `subPocketService`, `accountService`
- `pocketService` → imports `accountService`, `subPocketService`
- `subPocketService` → imports `pocketService`

Solved with:
```typescript
let pocketServiceCache: any = null;
const getPocketService = async () => { ... dynamic import ... };
```

This defeats tree-shaking, makes testing impossible, and eliminates type safety.

After step02/task-01 removes direct Supabase access, services become thin API wrappers. The circular deps exist because services orchestrate multi-entity operations (e.g., "delete account" needs to handle movements and pockets). This orchestration should live in a separate layer.

## Technical Requirements
1. Create a `frontend/src/services/orchestration/` directory for multi-entity operations
2. Move cascade delete logic to `orchestration/accountOrchestrator.ts`
3. Move transfer logic to `orchestration/transferOrchestrator.ts`
4. Move balance recalculation to `orchestration/balanceOrchestrator.ts` (or remove entirely if triggers handle it)
5. Make individual services (accountService, pocketService, movementService) focused on single-entity CRUD via apiClient
6. Remove ALL lazy dynamic imports and `any` caches
7. Remove ALL `eslint-disable` comments for `@typescript-eslint/no-explicit-any`
8. Services should NOT import each other — only orchestrators import services

## Dependencies
- `frontend/src/services/accountService.ts`
- `frontend/src/services/movementService.ts`
- `frontend/src/services/pocketService.ts`
- `frontend/src/services/subPocketService.ts`
- Depends on step02/task-01 being complete (no more Supabase direct access)

## Implementation Approach
1. After task-01, services are thin API wrappers — identify which methods still need cross-service calls
2. Extract those methods into orchestration modules
3. Remove all `getPocketService`, `getSubPocketService`, `getMovementService` lazy getters
4. Remove all `any` typed caches
5. Update hooks/mutations to call orchestrators for multi-entity operations
6. Verify no circular imports remain (use a tool like `madge` or manual inspection)

## Acceptance Criteria

1. **No Circular Dependencies**
   - Given the services directory
   - When analyzing import graph
   - Then no circular dependency exists between service files

2. **No `any` Types in Services**
   - Given the services directory
   - When searching for `: any` or `as any`
   - Then zero results are found

3. **No Dynamic Imports for Dependency Resolution**
   - Given the services directory
   - When searching for `await import(`
   - Then zero results are found (except legitimate code-splitting)

4. **Single Responsibility**
   - Given `movementService.ts`
   - When reviewing its methods
   - Then it only handles movement CRUD via apiClient (no balance logic, no orphan logic, no transfer logic)

5. **Orchestrators Are Testable**
   - Given an orchestrator module
   - When writing unit tests
   - Then services can be easily mocked (no dynamic imports needed)

## Metadata
- **Complexity**: Medium
- **Labels**: Architecture, Services, Code Quality, Refactor
- **Required Skills**: TypeScript, module architecture, dependency management
