# narrative-compiler

## Purpose

Use this skill when creating a long-form webnovel outline that must remain stable across later character, plot, and chapter generation.

## Operating Model

Treat outline creation as compilation, not free prose generation.

1. Lock the narrative kernel first: audience, genre, protagonist, premise, core conflict, emotional promise, commercial hooks, taboo list, canon terms, and ending direction.
2. Derive world pressure from the kernel: public crisis, hidden crisis, resource/rule pressure, and social/relationship pressure.
3. Build faction plans before plot beats. Every major faction needs a goal, resources, constraints, timeline, and collision point with the protagonist.
4. Generate event cards instead of vague outline paragraphs. Each event card must include pre-state, trigger, protagonist goal/action, opposition actor/motive/resources, conflict, cost, gain, state delta, promises planted or paid, character arc delta, and reader hook.
5. Maintain a promise ledger. Every important setup must have a seed event, payoff window, risk, and reader question. Major promises should have a payoff event.
6. Maintain a state ledger. Every committed event must write back protagonist state, relationship state, world state, and reader state.
7. Compile the event chain into beginning, development, climax, and ending only after the structure validates.

## Validation

- Program logic owns IDs, uniqueness, references, stage coverage, promise links, state writeback, and count thresholds.
- LLM auditors judge plausibility, novelty, emotional curve, character agency, antagonist rationality, and payoff satisfaction.
- Do not lower standards to pass. Repair the structural cause of a failure.

## Output Expectations

- The final outline must be readable by the user, but backed by structured event cards.
- Conflicts must come from protagonist choices, faction plans, world pressure, or prior consequences.
- The ending should be surprising but inevitable.
- The system should preserve the user-provided background, synopsis, audience, CP constraint, protagonist facts, and canon names.
