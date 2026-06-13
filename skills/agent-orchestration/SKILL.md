# agent-orchestration

## Purpose

Use this skill for every multi-agent novel task that delegates work, merges results, repairs failures, or records reusable experience.

## Roles

1. The primary agent owns task decomposition, canonical facts, conflict resolution, repair escalation, and final acceptance.
2. Worker agents own one bounded domain. They do not create final deliverables or overwrite canonical facts.
3. Program validators own IDs, references, counts, schemas, provenance, ordering, and other deterministic rules.
4. Human review owns approval of semantic changes to worldbuilding, characters, relationships, and plot commitments.

## Context Rules

1. Create a context fingerprint from the source brief, approved outline, characters, relations, events, and plot version.
2. Freeze worker and primary model routing for the duration of a run.
3. Give each worker the same canonical source snapshot plus a role-specific brief.
4. Do not let workers communicate by mutating shared state. They declare dependencies for the primary agent to resolve.
5. Reject results if the canonical context changes before application.

## Worker Contract

Each worker returns:

- worker name
- summary
- claims with conclusion, evidence, and confidence from 0 to 1
- risks
- dependencies

Claims without evidence do not enter integration. Low-confidence claims remain advisory.

## Quality And Recovery

1. Validate every worker envelope before merging.
2. Escalate transport, JSON, or contract failures to the primary model.
3. Merge by evidence and canonical priority, not majority vote.
4. Run deterministic validation after every repair.
5. Persist run state, stages, models, workers, quality gates, errors, and review status.
6. Persist pending review drafts so refresh cannot silently lose completed work.

## Experience

1. Successful repairs enter a bounded candidate experience store.
2. A candidate records trigger, resolution, evidence, and verified success count.
3. Candidates never modify formal skills automatically.
4. Promote only deterministic patterns after repeated program verification.
5. Semantic writing strategies require human confirmation and versioned rollback.
