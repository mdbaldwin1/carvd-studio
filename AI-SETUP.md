# AI Setup and Migration Notes

## Goals

- Keep repo instructions clear and tool-agnostic.
- Minimize duplicated guidance across multiple files.
- Keep secrets out of repo and local config files whenever possible.

## Repo-Level Setup

### 1) Agent instructions

- Primary file: `AGENTS.md`
- Supporting references:
- `CLAUDE.md` for workflow and quality gates

### 2) MCP local config

- Local MCP config file: `.mcp.json` (gitignored)
- Template file: `.mcp.example.json` (tracked)
- Use environment variables for tokens instead of hardcoded secrets.

### 3) Recommended environment vars

- `MDBALDWIN1_GITHUB_PERSONAL_ACCESS_TOKEN`
- Any provider tokens required by your local MCP servers

## Claude Config Review Findings

### High-priority issues

- `~/.claude/mcp.json` currently stores live tokens in plaintext.
- `~/.claude/settings.json` has `skipDangerousModePermissionPrompt: true`, which weakens safety checks.

### Redundancy / maintenance cost

- Project context is spread across `CLAUDE.md` and multiple files in `.claude/docs/`.
- Keep only stable rules in one place and move fast-changing status into handoff docs.

## Recommended Global Policy

- Keep global AI settings minimal and safe.
- Avoid broad global allowlists for external systems unless actively needed.
- Prefer per-repo config and explicit approvals for privileged actions.
- Rotate any token that was previously committed or stored in plaintext.

## Suggested Next Actions

1. Rotate GitHub and Atlassian tokens that were exposed in local plaintext configs.
2. Move all local MCP credentials to environment variables.
3. Remove `skipDangerousModePermissionPrompt` from global Claude settings.
4. Keep `AGENTS.md` as the main agent contract for this repo.
