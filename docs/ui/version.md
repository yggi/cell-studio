# Version and updates

- **At a glance**: the commit's first 7 characters under the title (`src/ui/Version.svelte`), `dev` where the build doesn't know its commit. Releases aren't meaningful yet, so the hash stands for a build.
- **The sheet** (a tap on it): the commit in full (copyable), the branch (`pr-<n>` for a preview build), the build date in UTC, the package's version, and the version of each dependency the app ships. A dependency taken from git shows its tag (`v0.2.0`); another shows the installed version. A new dependency, `webmidi` among them once it is one, appears with no change here.
- **Where it comes from**: `tools/build-info.ts` runs when `vite.config.ts` loads: CI's variables first (`GITHUB_SHA`, `GITHUB_HEAD_REF`, `GITHUB_REF_NAME`), then git, and `__BUILD__` carries the result (`src/buildInfo.ts`). Everything it reads is an argument, so its test runs it over a made-up checkout.
- **Updates**: the service worker waits (`registerType: 'prompt'`); `src/ui/state/update.svelte.ts` holds "a new version is ready", the toast (`UpdateToast.svelte`) and the sheet both show it, and nothing reloads until Reload is pressed, so a playing piece is never cut off. A dot after the hash says an update waits.
- **Jambot** has the same files, lifted (yggi/jambot#350): the two apps keep one shape, with no package between them.
