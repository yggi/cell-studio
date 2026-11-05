// A dependency pinned at a git tag (`github:yggi/<repo>#vX.Y.Z`) and what the lockfile installs for it (#546): moving a
// pin by editing package.json and running `npm install` can update the lockfile's spec and leave its entry at the old
// commit, so `npm ci` installs the old version under the new pin. `tools/pins.test.ts` holds package-lock.json to it.
// Move a pin with `npm install @yggi/<repo>@github:yggi/<repo>#vX.Y.Z`.

/** The parts of a package-lock.json (lockfileVersion 2 or 3) this reads. */
export interface Lock {
  readonly packages: Readonly<Record<string, { readonly version?: string; readonly dependencies?: Readonly<Record<string, string>> }>>;
}

/** Each git-tag pin whose lockfile entry installs another version: its name, the tag's version and the entry's. */
export function pinDrift(lock: Lock): { name: string; pinned: string; locked: string | null }[] {
  const root = lock.packages[''] ?? {};
  const out: { name: string; pinned: string; locked: string | null }[] = [];
  for (const [name, spec] of Object.entries(root.dependencies ?? {})) {
    const tag = /^github:[^#]+#v(\d+\.\d+\.\d+(?:-[\w.]+)?)$/.exec(spec);
    if (!tag) continue;
    const locked = lock.packages[`node_modules/${name}`]?.version ?? null;
    if (locked !== tag[1]) out.push({ name, pinned: tag[1]!, locked });
  }
  return out;
}
