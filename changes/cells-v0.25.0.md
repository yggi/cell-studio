### Changed

- **The language is cells v0.25.0** ([its changelog](https://github.com/yggi/cells/blob/main/CHANGELOG.md#v0250--2026-11-12)):
  - **Kinderlieder's six tunes are its parts, and `waltz` and `korobeiniki` are `waltzBar` and `korobeinikiBar`** (cells decision 082). **This can affect saved `.cells` pieces:** a piece that takes `twinkle`, `wonder`, `haenschen`, `hinein`, `heim`, `weinet`, `waltz` or `korobeiniki` by a `from` line doesn't compile until Migrate rewrites it (`&twinkle from twinkle &key` → `&twinkle from kinderlied &key`). The examples of those names open and play as before.
  - **The swing example is the meter's swing showcase:** *Swing: the long and the short*, a jazz swing in F whose slider leans its eighths. What it plays changed.
  - **Three new examples of the meter's feel:** *Funk: the sixteenths lean*, *Aksak: twos and a three* and *Twelve-eight: the lean of three*.
  - **New in the language:** `pan=` can move, as `lpf=` does; five styles find a harmony of their own; a gate's stack plays in either order, `[&kickForm * &kick]`; a line that says its part (`part=bass`) compiles when a performer takes it.
  - Nothing else an existing example plays changes.
- **A tempo moved while playing keeps the beat:** the beat in progress keeps its place and only what follows runs at the new rate, where the piece jumped (#638, yggi/cells#56). This holds for a tempo slider, a knob learned to it, and any change made while the piece plays.

### Fixed

- **Holding a template's head switches it off:** `&bar from meter &tempo` becomes `&bar off from meter &tempo`, and the piece plays without it, where the hold did nothing. A cell that can't be switched off, such as a template's own cell or one of several heads that one `from` line takes, now says why for a moment instead of doing nothing (#638).
