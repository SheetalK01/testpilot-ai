# Prompt to build TestPilot AI with Claude Code

Run from the repo root:

```bash
cd ~/Code/testpilot-ai
git checkout develop && git pull
claude
```

Then paste:

```
You are building my portfolio project "TestPilot AI". I am a QA Engineer applying for
QA Automation / SDET / Full Stack roles, and this repo is the centrepiece of my interviews.
It must be top-notch: production-quality code, an eye-catching UI, and every skill clearly
visible (frontend, backend, database, AI/LLM, QA automation, DevOps).

1. Read docs/BUILD_SPEC.md completely before writing any code. It is the single source of
   truth: scope and out of scope, tech stack, architecture, repository layout, database
   schema, every API contract, AI engine, frontend design system and pages, data-testids,
   QA automation suites, DevOps, documentation, security checklist and build order.
   Follow it exactly.

2. Work on the develop branch, phase by phase (section 18). After each phase: run that
   phase's checks, fix every failure, commit with a clear message, and push. Do not build
   anything listed under "Out of scope".

3. Quality over speed. If something cannot be finished properly, finish and polish what
   exists before adding more. Never leave broken or half-done code behind.

4. Before writing the Claude API code in the AI engine, check the current Anthropic
   Python SDK docs for exact parameter names, as the spec says.

5. Use mock AI mode for all tests and CI. I will put my real ANTHROPIC_API_KEY in .env
   myself. Never ask me to paste a key in chat and never commit secrets.

6. If you need a decision from me, ask one short question. Otherwise keep going until
   every phase is done.

7. At the end, open a pull request develop → main titled "TestPilot AI v1.0" (do not
   merge it). Then give me a summary: what was built, test counts per suite with
   pass/fail, backend coverage %, how to run it locally, and anything you could not
   finish.
```

If Claude stops between phases, reply `continue`.
