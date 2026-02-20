# Website Bundle Size Audit

## Scope

- Bead: `carvd-studio-11.3`
- Comparison target:
  - Baseline (pre-website cleanup): `23ceaf5` (after PR #266)
  - Current (post-11.1/11.2): `a5b4cc7` (after PR #268)

## Build Method

1. Build baseline in detached worktree at `23ceaf5`:
   - `npm run build --workspace=@carvd/website`
2. Build current in `develop` worktree at `a5b4cc7`:
   - `npm run build --workspace=@carvd/website`
3. Compare key output assets in `packages/website/dist/assets`:
   - main CSS (`index-*.css`)
   - main JS (`index-*.js`)
   - total emitted assets (raw and gzip sum)

## Results

| Metric              | Baseline (`23ceaf5`) | Current (`a5b4cc7`) | Delta            |
| ------------------- | -------------------- | ------------------- | ---------------- |
| Main CSS (raw)      | 63,769 bytes         | 47,497 bytes        | -16,272 (-25.5%) |
| Main CSS (gzip)     | 11,623 bytes         | 8,994 bytes         | -2,629 (-22.6%)  |
| Main JS (raw)       | 331,534 bytes        | 331,534 bytes       | 0 (0.0%)         |
| Main JS (gzip)      | 103,577 bytes        | 103,574 bytes       | -3 (-0.0%)       |
| Total assets (raw)  | 612,641 bytes        | 597,122 bytes       | -15,519 (-2.5%)  |
| Total assets (gzip) | 178,491 bytes        | 176,121 bytes       | -2,370 (-1.3%)   |

## Notes

- The website cleanup produced a large CSS reduction, which aligns with removing legacy `index.css` and consolidating styles into Tailwind + shadcn patterns.
- Main JS remained effectively flat, indicating Radix/shadcn usage did not introduce a notable website runtime bundle increase in this phase.
- Net website payload improved both raw and gzipped after migration cleanup.
