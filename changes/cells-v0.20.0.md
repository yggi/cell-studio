### Changed

- **The language is cells v0.20.0** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md#v0200--2026-11-08)):
  - **Two retired forms are errors**: a line stepped by a meter cell's own steps (`step=&bar`, `step=&bar*2` on a `meter(…)` or a `scan(…)`) and a bare `swing=r` on a meter. Each names the tap or level that says the same (`step=pulse`, `step=8n`, `swing=8n:r`), and Migrate rewrites it. **A saved piece that writes either stops compiling** until it's rewritten; no example does.
  - **A moving parameter is edited whole**: a sheet row shows and replaces `lpf=70..4800 * &eg * &lfo` whole, where it showed `70..4800` and left the factors behind on a change.
  - Nothing a piece plays changes.
