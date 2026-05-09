# CLAUDE.md — AI Agent Instructions

## What is this project?
_TODO — one-paragraph description of what cropguard is, who it's for, and the problem it solves._

## Read context first
Before doing any work, read `.context/index.md` — it explains the project and links to all plans and research.

## Repo structure
```
cropguard/
├── CLAUDE.md                  — Agent entry point
├── .context/                  — Knowledge base
│   ├── index.md
│   ├── links.md
│   ├── plans/
│   │   ├── principles.md
│   │   ├── project.md
│   │   ├── architecture.md
│   │   └── tools.md
│   └── research/
├── .claude/
│   ├── settings.json          — Hooks config
│   └── hooks/
│       └── check-gstack.sh   — gstack install guard
└── .git/
```

## Working conventions
- Commit often with descriptive messages
- Keep `.context/` updated as the project evolves
- Document research and decisions in `.context/research/`
- When adding or removing files/directories, update the repo structure tree in this file

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
