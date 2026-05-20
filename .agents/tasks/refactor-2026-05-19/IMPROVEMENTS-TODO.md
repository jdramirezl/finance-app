# Additional Improvements & Bugs to Investigate

These came up during the refactor and should be addressed after step01-05 are complete.

## Open Questions to Investigate
- [ ] Have we deleted every direct front-to-db reference? (Remaining: movementService bulk ops need backend endpoints first)
- [ ] Are all modals synchronized? (Some modals may have capabilities others lack when they shouldn't)
- [ ] Are all features logically sound? (Not code quality, but whether the feature design itself makes sense)
- [ ] How are we automating things / making them more intuitive? (Template preloading, UI flow)
- [ ] Are there features that are more obstacles than helpers?

## Reported Bugs (Not Yet Tasked)
- [ ] Budget auto-generate movements selects random accounts — should let user pick which account to use
- [ ] Editing movements requires opening the full modal — should allow inline editing of at least the amount field


## Frontend Anti-Patterns to Audit
- [ ] Speed: unnecessary re-renders, missing virtualization, no code splitting
- [ ] Concurrency: race conditions in remaining async effects, stale closures
- [ ] Usability: hidden actions (hover-only buttons), undiscoverable features (triple-click refresh), no keyboard nav
- [ ] Forms: inconsistent validation timing, lost state on error, no dirty checking
- [ ] Data loading: no pagination, no skeleton states, flash of empty content
- [ ] Error handling: silent failures, no error boundaries, inconsistent toast vs inline errors
