# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal task management system with future WhatsApp reminder integration via Green API.
Users can create, track, and manage personal tasks, and will receive WhatsApp reminders at scheduled times.

## Tech Stack

- **Next.js 14** — App Router (server components, server actions)
- **Prisma** — ORM for database access
- **SQLite** — local database (via Prisma)
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — accessible component library built on Radix UI
- **Green API** *(planned)* — WhatsApp notifications and reminders

## Repository Structure

```
.claude/
├── agents/    # Custom Claude agents for this project
├── skills/    # Custom Claude skills for this project
└── commands/  # Custom Claude slash commands for this project
```

The `.claude/` directory holds project-specific Claude Code configuration: agents, skills, and commands that will be added as the project grows.
