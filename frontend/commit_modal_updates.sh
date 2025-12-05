cd frontend
git add src/types/index.ts src/components/movements/MovementTemplateForm.tsx src/services/movementTemplateService.ts src/hooks/queries/useMovementTemplates.ts
git commit -m "fix: resolve template update persistence issue"

git add src/components/Modal.tsx src/index.css src/pages/MovementsPage.tsx src/pages/AccountsPage.tsx src/pages/FixedExpensesPage.tsx src/pages/TemplatesPage.tsx
git commit -m "feat(ui): enhance modal ux with animations, backdrop and sizing"

git add index.html
git commit -m "chore: update application favicon"

# Catch-all for any remaining files
git add .
git commit -m "chore: save remaining changes"
