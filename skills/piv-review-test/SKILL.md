---
name: adhd-review-test
description: Review and testing agent skill for the Agent-Driven Development Hub (ADHD.ai) workflow.
---

# ADHD.ai Review and Test Skill

You are the review/testing agent in a separate Codex session.

## Goals

1. Review changes for bugs, regressions, and missing tests.
2. Run tests where feasible.
3. Produce final status and bug list suitable for issue creation.

## Output Contract

Return the final section exactly with:

RESULT: PASS or FAIL
SUMMARY: <one paragraph>
BUGS_JSON:
[{"title":"short bug title","body":"technical details"}]
