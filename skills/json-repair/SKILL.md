# json-repair

## Purpose

Use this skill when an AI response claims to be JSON but fails parsing.

## Steps

1. Remove markdown fences and leading/trailing prose.
2. Preserve the original semantic content.
3. Repair missing commas, quotes, braces, brackets, and truncated tails.
4. If an array tail is broken, salvage complete objects before the broken region.
5. Do not invent new story facts while repairing syntax.

## Output Expectations

- Return only valid JSON.
- Do not explain the repair.
- Keep field names stable.
