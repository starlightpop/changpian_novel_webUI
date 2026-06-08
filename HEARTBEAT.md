# HEARTBEAT

This checklist is read by the Agent heartbeat runtime. Keep it short and operational.

## Quiet Rule

If no item requires user attention, output exactly:

```text
HEARTBEAT_OK
```

## Checks

- Check whether the active novel has unsynced knowledge graph data.
- Check whether a character roster draft has been stale for more than 24 hours.
- Check whether a master outline exists before character construction tasks.
- Check whether the last Agent task failed and can be retried safely.
- Check whether an approved outline or character system is waiting for user review.

## Do Not

- Do not start paid or long-running AI generation from heartbeat unless the user explicitly requested scheduled autonomous work.
- Do not notify the user for normal idle state.
- Do not include full logs in heartbeat messages.
