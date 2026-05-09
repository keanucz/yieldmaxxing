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
│   └── settings.json          — Claude Code project settings
└── .git/
```

## Working conventions
- Commit often with descriptive messages
- Keep `.context/` updated as the project evolves
- Document research and decisions in `.context/research/`
- When adding or removing files/directories, update the repo structure tree in this file
