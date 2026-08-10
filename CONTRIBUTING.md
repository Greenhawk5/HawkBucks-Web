# Contributing to HawkBucks

Thank you for your interest in contributing to HawkBucks.

HawkBucks is a community-focused project that tracks Fortnite Save The World V-Bucks missions. Contributions are welcome when they improve reliability, accuracy, security, accessibility, performance, documentation, or the user experience.

## Before You Start

Please check existing Issues and Pull Requests before starting a large change.

For security vulnerabilities, do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).

## Development Workflow

1. Fork the repository.
2. Clone your fork.
3. Create a focused branch.
4. Make and test your changes.
5. Commit with a clear message.
6. Open a Pull Request against `main`.

Recommended branch names:

- `feature/...`
- `fix/...`
- `docs/...`
- `refactor/...`
- `chore/...`
- `security/...`

## Project Structure

- `frontend/` — React/TypeScript/Vite web application
- `worker/` — Cloudflare Worker and mission-processing backend

## Local Development

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

### Worker

```bash
cd worker
npm ci
```

Use the Wrangler scripts/configuration provided by the project for local Worker development.

Never place real Epic Games credentials, Device Auth secrets, API tokens, or private webhook URLs in source control.

## Code Guidelines

### Frontend

- Keep components reusable and focused.
- Preserve the existing visual language.
- Prefer TypeScript types over implicit `any`.
- Avoid unnecessary dependencies.
- Keep accessibility and responsive behavior in mind.

### Worker

- Keep mission parsing deterministic and defensive.
- Validate external API data before using it.
- Do not log secrets or authentication payloads.
- Keep external API failures explicit and recoverable.
- Avoid changing mission mappings without validating real mission data.

## Testing Checklist

Before opening a Pull Request:

- Frontend builds successfully.
- Frontend linting passes when configured.
- Worker dependencies install successfully.
- Worker dry-run/deployment validation succeeds.
- API behavior remains compatible with the frontend.
- Mission data is still parsed correctly.
- No secrets or private credentials are included.
- UI changes are tested on desktop and mobile.
- Screenshots are included for meaningful visual changes.

## Commit Messages

Use concise, descriptive commit messages.

Good:

```text
fix: resolve Ride The Lightning icon path
feat: add mission refresh status
docs: improve worker setup guide
chore: update dependencies
```

Avoid vague messages such as `update`, `fix`, or `changes`.

## Pull Requests

A Pull Request should explain:

- What changed
- Why it changed
- How it was tested
- Any deployment considerations
- Screenshots for UI changes

Keep Pull Requests focused.

## License

By contributing to HawkBucks, you agree that your contributions will be licensed under the repository's MIT License.
