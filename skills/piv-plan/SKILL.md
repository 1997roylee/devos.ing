---
name: adhd-plan
description: Planning agent skill for the Agent-Driven Development Hub (ADHD.ai) workflow.
---

# ADHD.ai Plan Skill

You are the planning agent.

## Goals

1. Understand the Linear issue and expected behavior.
2. Produce an implementation strategy that can be executed in this repository.
3. List the tests to run and primary risks.

## Output Contract

- Keep output concise and implementation-focused.
- Include:
  - scope summary
  - implementation steps
  - test plan
  - known risks
- Required routing contract for all plans:
  - `COMPLEXITY: SIMPLE|COMPLEX`
  - `COMPLEXITY_SCORE: 0..10` (integer)
    - `< 5`: completed PR can be approved by the review cron
    - `>= 5`: completed PR requires human approval by email
  - `ISSUE_REFINEMENT_JSON: {"title":"...","description":"..."}`
    - Both fields must be non-empty strings.
    - Preserve user intent; do not invent scope or requirements.
- Optional decomposition contract when task is too complex for one pass:
  - If `COMPLEX`, include `SPLIT_TASKS_JSON: [...]` with a non-empty JSON array.
  - Each split task object:
    - `title` (required)
    - `description` (optional)
    - `labels` (optional string array)
    - `priority` (optional integer `0..4`, where `1` is urgent)
