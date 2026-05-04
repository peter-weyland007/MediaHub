# TV Watched Cleanup Policy Implementation Plan

> **For Hermes:** Follow strict TDD while implementing this plan.

**Goal:** Add Tautulli-backed watched detection plus per-show TV cleanup policies so MediaHub can unmonitor or delete watched episodes safely.

**Architecture:** Persist one app-wide `tvCleanupPreferences` object in SQLite app state. Store default watched thresholds plus a per-show policy map keyed by Sonarr series id. Surface watched evidence and manual cleanup actions on TV show/season/episode pages, and provide a bulk "apply show policy" action for eligible watched episodes.

**Tech Stack:** Express, better-sqlite3, React, Sonarr API v3, Tautulli API v2, source-contract tests, sqlite server tests.

## Planned slices

1. Persist `tvCleanupPreferences` through `server/database.js`, `server/app.js`, `src/lib/appConfigApi.js`, and `src/lib/useServiceConfig.js`.
2. Add Sonarr action helpers for episode monitor updates and episode-file deletion.
3. Add TV watched/cleanup helper module for:
   - policy normalization
   - watched evidence matching from Tautulli rows
   - eligibility calculation (`>= 90%`, `>= 3 days`)
4. Add source tests for UI/API wiring on TV show/season/episode pages.
5. Implement show-level policy card with:
   - mode selector
   - threshold summary
   - eligible count
   - apply-policy action
6. Implement episode-level watched evidence + manual actions.
7. Run focused tests, full tests, build, and live verification.
