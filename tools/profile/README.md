# Profiling the live app

Reproducible numbers for issue #13 (main-thread load while playing). Headless Chromium has no audio
device, so this measures the page, not audible glitches; use a real phone for those.

    npm run build && npx vite preview --port 4173 &
    # main-thread busy % and long tasks per piece, 20 s each, CPU throttle ×1 and ×4:
    node tools/profile/measure.mjs http://localhost:4173/ 4 20 "Metronome" "Hypercell" "Test Tones on Tape"
    #                                                    ^throttle ^seconds ^piece titles (library search text)

    # where the time goes: build unminified, sample with the CDP profiler, aggregate
    npx vite build --minify false --outDir /tmp/dist-nomin && npx vite preview --outDir /tmp/dist-nomin --port 4174 &
    THROTTLE=4 node tools/profile/cpu.mjs http://localhost:4174/ "Hypercell" 15    # writes profile-Hypercell.json
    node tools/profile/agg.mjs profile-Hypercell.json                   # self / inclusive time by function
    node tools/profile/names.mjs scheduling,tick,flush profile-*.json   # inclusive % of named functions
    node tools/profile/lines.mjs profile-Hypercell.json /tmp/dist-nomin/assets/index-*.js   # inclusive % by source line (shows the code)

    # the browser's own time (style/layout/paint/GC) and the long tasks, from a Chrome trace; CSS= ablates a kind of drawing
    THROTTLE=4 node tools/profile/trace.mjs http://localhost:4173/ "Hypercell" 10

    # long tasks: what each one rewrote in the DOM, and (CPU profile) what the bursts spend their time on
    node tools/profile/bursts.mjs http://localhost:4173/ "Prelude and Fugue in C minor" 25
    node tools/profile/burstlines.mjs profile-Prelude_and_Fugue_in_C_minor.json /tmp/dist-nomin/assets/index-*.js

    # engine cost without a browser (compile / plan / events per example; what a table turn costs `cellView`):
    npx vite-node tools/profile/engine-time.ts
    npx vite-node tools/profile/cellview-time.ts examples/bwv847.cells

`measure.mjs` prints one JSON line per piece (`taskPct` = main-thread busy %, `longtasks` > 50 ms).
Playwright is found by `playwright.mjs` (set `PLAYWRIGHT=` or `CHROME_PATH=` if needed).
Commit result tables to the issue, not here; `profile-*.json` is ignored.
