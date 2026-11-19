# Frozen Go execution-contract migrations (vendored)

These files are byte-for-byte copies of the frozen schema gate in
`ytci-go/testdata/migrations/`, merged in
[ytci-go#41](https://github.com/bradleygichuru/ytci-go/pull/41) for
[ytci-mobile#359](https://github.com/bradleygichuru/ytci-mobile/issues/359).

| File | Stream | Mirrored by |
|---|---|---|
| `0017_mice_event_contracts.sql` | MICE | `src/db/migrations/0028_mice_event_contracts.sql` |
| `0030_recognition_contracts.sql` | Recognition | `src/db/migrations/0029_recognition_contracts.sql` |
| `0043_species_contracts.sql` | Species | `src/db/migrations/0030_species_contracts.sql` |
| `0056_analytics_contracts.sql` | Analytics | `src/db/migrations/0031_analytics_contracts.sql` |
| `0069_platform_contracts.sql` | Platform | `src/db/migrations/0032_platform_contracts.sql` |

The contract is **frozen at 1.0.0**. These files are the reference side of the
parity check in `scripts/schema-parity.mjs`, which applies them to the
production baseline and compares tables, columns, constraints, indexes and
triggers with the Drizzle production chain.

Do not edit the vendored files. A contract change is a change-control ticket in
`ytci-go`, followed by a refresh of this directory and the matching Drizzle
migration.

## Refreshing from upstream

```bash
# from a checkout that has ../../ytci-go next to this repo
for f in 0017_mice_event_contracts 0030_recognition_contracts \
         0043_species_contracts 0056_analytics_contracts 0069_platform_contracts; do
  cp "../ytci-go/testdata/migrations/$f.sql" "src/db/contracts/go/$f.sql"
done
```

SHA-256 at vendoring time:

```
d6eb8b57066385954a3a1fe6d646af5cd19cae29d1327633474ae267517b2597  0017_mice_event_contracts.sql
829b694bd60583067f1b84557f394fbb14a8e87230cb8b8295bf1129f1498af0  0030_recognition_contracts.sql
c456cbff05e7a2b3372b350207451f7ec474e7627abc587cb20d6e6e0ea560fa  0043_species_contracts.sql
d277c44d9b21125f0f9119469229d834828b2d3bb8c46eb8fa6f32b4c5d74ec2  0056_analytics_contracts.sql
38981ae493d64d5c072b05735408ee652b04cad076f5c14a1e9e1de07f8b4b21  0069_platform_contracts.sql
```
