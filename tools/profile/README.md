# Profiling the live app

Reproducible numbers for issue #13 (main-thread load while playing). Headless Chromium has no audio
device, so this measures the page, not audible glitches; use a real phone for those.

    npm run build && npx vite preview --port 4173 &
    # main-thread busy % and long tasks per piece, 20 s each, CPU throttle ×1 and ×4:
    node tools/profile/measure.mjs http://localhost:4173/ 4 20 "Metronome" "Hypercell" "Test Tones on Tape"
    #                                                    ^throttle ^seconds ^piece titles (library search text)

    # where the time goes: build unminified, sample with the CDP profiler, aggregate
    npx vite build --minify false --outDir /tmp/dist-nomin && npx vite preview --outDir /tmp/dist-nomin --port 4174 &
    node tools/profile/cpu.mjs http://localhost:4174/ "Hypercell" 15    # writes profile-Hypercell.json
    node tools/profile/agg.mjs profile-Hypercell.json                   # self / inclusive time by function
    node tools/profile/names.mjs scheduling,tick,flush profile-*.json   # inclusive % of named functions

    # engine cost without a browser (compile / plan / events per example):
    npx vite-node tools/profile/engine-time.ts

`measure.mjs` prints one JSON line per piece (`taskPct` = main-thread busy %, `longtasks` > 50 ms).
Playwright is found by `playwright.mjs` (set `PLAYWRIGHT=` or `CHROME_PATH=` if needed).
Commit result tables to the issue, not here; `profile-*.json` is ignored.
