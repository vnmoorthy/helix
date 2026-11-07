# Security

- The Oriane key is server-only. It is never sent to the browser.
- `POST /api/key` only works on `localhost` unless `HELIX_ALLOW_KEY_UI=1` is set. Never set that on a public deployment.
- Live re-sequencing is rate-limited per IP; cached sequences are free to read.

Found a vulnerability? Open a private security advisory on GitHub instead of a public issue.
