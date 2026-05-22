# New Agent Startup Prompt

Paste this as the first message in a new conversation:

---

I'm continuing work on my personal finance app. Read the handoff document at `/local/home/jdrami/finance-app/.agents/HANDOFF.md` for full context on the project, architecture, what was done, and how we work.

Then run these baseline checks:

1. **Read the handoff document** completely
2. **Check git status**: `cd /local/home/jdrami/finance-app && git log --oneline -5 && git status`
3. **Verify builds pass**: `cd backend && npm run build` and `cd frontend && npx tsc --noEmit`
4. **Run tests**: `cd backend && npm run test:unit 2>&1 | tail -5` and `cd frontend && npx vitest run --exclude 'e2e/**' 2>&1 | tail -5`
5. **Check what's pending**: Read `.agents/tasks/MASTER-ROADMAP.md` and the memory entries for `finance-app-pending-bugs`
6. **Scan for broken things**: `grep -rn "TODO\|FIXME\|HACK" frontend/src/ backend/src/ | grep -v node_modules | grep -v .test. | head -20`

After running all checks, give me:
- Current build status (pass/fail)
- Current test status (how many pass/fail)
- What's pending/broken
- What you recommend we tackle next

The working directory is `/local/home/jdrami/finance-app`. The branch is `refactor/full-codebase-cleanup`. I test locally on my Mac by pulling from this branch and running `npm run dev:all`.

Key rules:
- Use gpu-research subagents for task breakdowns, then gpu-coder subagents in parallel waves for implementation
- All new features must include tests
- Keep the OLD visual style (standard Tailwind dark mode) — do NOT apply any custom design system
- Settings page keeps its new design (left nav + right content)
- Back up DB before any schema changes
- Verify build after every change
- Ask me to generate Stitch designs if you're unsure how something should look visually
