# Repository Hardening Checklist

## Secrets

- [ ] Never commit `settings.json`.
- [ ] Never commit `device_auths.json`.
- [ ] Never commit `.env` files containing real values.
- [ ] Never commit API tokens, private webhook URLs, or Cloudflare secrets.
- [ ] Use Cloudflare secrets/environment configuration for production credentials.
- [ ] If a secret was ever committed, rotate/revoke it even after deleting the file.

## GitHub

- [ ] Enable Dependabot alerts.
- [ ] Enable Dependabot security updates.
- [ ] Review GitHub Actions permissions.
- [ ] Protect the `main` branch when the project becomes collaborative.
- [ ] Require successful CI checks before merging when appropriate.
- [ ] Enable secret scanning if available.
- [ ] Review repository security settings periodically.

## Cloudflare

- [ ] Keep Epic credentials out of Worker source code.
- [ ] Keep production secrets in Worker secrets/environment configuration.
- [ ] Restrict CORS to the intended production frontend origin.
- [ ] Review Worker logs for accidental sensitive-data exposure.
- [ ] Keep KV data limited to information safe to expose through the API.

## Releases

- [ ] Update `CHANGELOG.md`.
- [ ] Create a Git tag/release for meaningful stable versions.
- [ ] Verify frontend production build.
- [ ] Verify Worker deployment.
- [ ] Test `/api/missions`.
- [ ] Verify the production website after deployment.
