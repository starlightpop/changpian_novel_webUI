# heartbeat

## Purpose

Use this skill for periodic autonomous checks that should stay quiet when nothing needs attention.

## Steps

1. Read `HEARTBEAT.md`.
2. Check due items and local application state.
3. If no task requires user attention, return exactly `HEARTBEAT_OK`.
4. If action is needed, return a short actionable notification.
5. Never perform expensive generation unless the checklist explicitly says it is allowed.

## Output Expectations

- Quiet path: `HEARTBEAT_OK`.
- Action path: one concise message with reason, affected item, and suggested next action.
