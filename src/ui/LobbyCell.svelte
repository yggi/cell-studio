<script lang="ts">
  /**
   * The library's lobby cell (#478, rung 2): the Jambot sessions open on the lobby (the Jam page's, the hosted one by
   * default), live while the library shows it (`state/lobbyWatch.svelte.ts`). A session chosen is joined and followed
   * as the Jam page follows one (read only, nothing sent but the join, pings and the leave), and leaving returns to the
   * piece you had. In the library's graph it is a disc beside the wheel (`disc`, its centre and radius in pixels:
   * `layout/library.ts` places it), showing the first `MOST`; among the cards, a section of them all. A session whose
   * host is away (the lobby holds it, and refuses a join) is dimmed, says so, and offers no join until the host is back.
   */
  import { getStudio } from './state/studio.svelte';

  let { disc }: { disc?: { x: number; y: number; r: number } } = $props();

  /** The most sessions the disc shows by name (the cards show them all). */
  const MOST = 6;

  const studio = getStudio();
  const { session, listed } = studio;
  const sessions = $derived(listed.sessions);
  const shown = $derived(disc ? sessions.slice(0, MOST) : sessions);
  /** The session joined or being joined, by its name as the lobby lists it (any case: the lobby's key). */
  const inIt = (name: string) => session.status !== 'idle' && session.session?.toLowerCase() === name.trim().toLowerCase();
  const state = (name: string) =>
    !inIt(name)
      ? null
      : session.status === 'joining'
        ? 'joining…'
        : session.status === 'rejoining'
          ? 'rejoining…'
          : studio.following
            ? 'following'
            : session.hostPlaying
              ? 'waiting for its text'
              : 'not playing';
  const said = $derived(
    listed.problem ??
      (!listed.answered ? 'Asking the lobby…' : sessions.length ? (disc && sessions.length > MOST ? `and ${sessions.length - MOST} more (Cards)` : null) : 'No session is open.'),
  );
  function choose(name: string) {
    if (inIt(name)) {
      if (studio.following) studio.view.tab = 'graph';
      return;
    }
    void studio.joinListed(name);
  }
  // (in the disc: its words as large as its size lets them be, and legible)
  const font = $derived(disc ? { title: Math.max(9, Math.min(22, disc.r * 0.12)), pill: Math.max(9, Math.min(18, disc.r * 0.1)) } : null);
</script>

{#snippet list()}
  {#each shown as s (s.name)}
    {@const st = state(s.name)}
    {@const away = st === null && s.away}
    <button
      class="unstyled session"
      class:in={st !== null}
      class:away
      disabled={away}
      onclick={() => choose(s.name)}
      aria-label="{st ? `${s.name}: ${st}` : away ? `${s.name}: its host is away` : `Join ${s.name}`}, {s.players} {s.players === 1 ? 'player' : 'players'}"
      title={away
        ? 'Its host is away: the lobby holds the session, and it can be joined once the host is back'
        : `${s.players} ${s.players === 1 ? 'player' : 'players'}, the host counted`}
    >
      <span class="name">{s.name}</span>
      <span class="players">{st ?? (away ? 'away' : s.players)}</span>
    </button>
  {/each}
  {#if said}<span class="said" role="status">{said}</span>{/if}
  {#if session.status === 'idle' && session.ended}<span class="said ended" role="status">{session.ended}</span>{/if}
{/snippet}

{#if disc && font}
  <div
    class="disc"
    role="group"
    aria-label="Jam sessions open"
    style:left="{disc.x}px"
    style:top="{disc.y}px"
    style:width="{2 * disc.r}px"
    style:height="{2 * disc.r}px"
    style:border-width="{Math.max(3, disc.r * 0.08)}px"
    style:padding="{disc.r * 0.3}px {disc.r * 0.24}px"
    style:font-size="{font.pill}px"
  >
    <span class="title" style:font-size="{font.title}px"><span class="live" aria-hidden="true"></span>Jam sessions</span>
    <div class="list">{@render list()}</div>
  </div>
{:else}
  <section class="row" aria-label="Jam sessions open">
    <h3><span class="live" aria-hidden="true"></span>Jam sessions <span class="kind">open on the lobby, live</span></h3>
    <div class="list">{@render list()}</div>
  </section>
{/if}

<style>
  .disc {
    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    border-radius: 50%;
    border-style: solid;
    border-color: var(--accent);
    background: var(--wheel-disc);
    color: var(--text);
    font-family: var(--font-ui);
    text-align: center;
    overflow: hidden;
  }
  .disc .title {
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .disc .list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3em;
    width: 100%;
    min-height: 0;
  }
  .live {
    display: inline-block;
    width: 0.55em;
    height: 0.55em;
    margin-right: 0.4em;
    border-radius: 50%;
    background: var(--accent);
    vertical-align: 0.08em;
  }
  .session {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    max-width: 100%;
    padding: 0.25em 0.7em;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    font: 600 1em/1.2 var(--font-ui);
    cursor: pointer;
  }
  .session .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .session .players {
    flex: none;
    color: var(--accent);
    font-weight: 700;
  }
  .session.in {
    border-color: var(--accent);
  }
  .session.away {
    border-style: dashed;
    color: var(--text-faint);
    cursor: default;
  }
  .session.away .players {
    color: var(--text-faint);
    font-weight: 600;
  }
  .session:not(.away):hover,
  .session:focus-visible {
    border-color: var(--accent);
    outline: none;
  }
  .said {
    color: var(--text-muted);
    font: 600 0.9em/1.2 var(--font-ui);
    overflow-wrap: anywhere;
  }
  .said.ended {
    color: var(--accent);
  }
  .row {
    display: grid;
    gap: 8px;
  }
  .row h3 {
    margin: 0;
    font: 700 13px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .row .kind {
    margin-left: 6px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text-faint);
  }
  .row .list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  .row .session {
    min-height: 36px;
  }
</style>
