# 0009: Terminal-state screen has no way to reset the game

## Status

Known issue — not yet fixed

## Context

`MainViewContent` ([MainView.jsx](../../src/frontend/src/views/MainView/MainView.jsx))
short-circuits to a bare status message when `useRound()` reports a
`terminalState` (`'completed'` from `game_completed`/`no_cases_remaining`, or
`'game_over'`):

```jsx
if (terminalState) {
  return (
    <div className={styles.gameFinished} role="status">
      {TERMINAL_MESSAGES[terminalState]}
    </div>
  );
}
```

No HUD, no settings gear, nothing else renders. The only UI trigger for
`resetGame()` (`RoundProvider`'s action, wired to `POST /api/v1/game/reset`)
lives inside `Settings`, which this branch never mounts.

## Problem

Once a `GameSession` reaches `COMPLETED` or `GAME_OVER`, the player has no
in-game way to start over — the terminal screen is a dead end. Discovered
2026-07-13 when a dev DB had no seeded cases yet: the first `/round` call
immediately exhausted the (empty) case pool and flipped the session to
`COMPLETED`, and there was no way to reach `Settings` to reset it. Had to be
fixed by hand via a direct DB update (`GameSession.status = 'GAME_OVER'`).

## Suggested fix

Render a reset action (either `Settings` itself, or a dedicated button
calling `resetGame()`) from the terminal-state branch, per the repo's TDD
workflow (Section 8): write a failing `MainView.test.jsx` case asserting a
reset control is present/clickable when `terminalState` is set, then
implement.
