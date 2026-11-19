# Evidence

Admin parity screenshots are committed in the **mobile** repo:

```
ytci-mobile/docs/verification/evidence/<ticket>/<track>/<screen>/<viewport>-<state>.png
```

This folder exists so admin-only evidence (Playwright traces that are small
enough to keep, seed manifests, live-run notes) has a home if a track needs it.
Do not commit `playwright-report/` or `test-results/`; CI uploads those as
artifacts.

See the mobile repo's `docs/verification/evidence/README.md` for the naming
contract.
