<script lang="ts">
  /**
   * Jam, a page of the sidebar: follow a Jambot session (#478, rung 1) by its name, a private one too (the open ones
   * are listed in the library's lobby cell, rung 2). Its lobby (the hosted one by default; the lobby cell lists this
   * one), the session's name and yours; joined, the host's section is the piece, read only, its graph turning with the
   * host's transport, and nothing is played or sent but the join, the pings and the leave (state/session.svelte.ts).
   * Leaving returns to the piece you had. The name to go by is one of this browser's own ("Cell studio k7m",
   * session/name.ts), so two Cell studios can join one session; refused all the same, another is offered.
   */
  import { anotherName, browserStore, defaultPlayerName, keepPlayerName } from '../session/name';
  import { NAME_KEY, SessionClient } from './state/session.svelte';
  import { getStudio } from './state/studio.svelte';

  const studio = getStudio();
  const { session } = studio;
  let name = $state(session.session ?? '');
  const store = browserStore();
  let player = $state(session.name ?? defaultPlayerName(store, NAME_KEY));
  const problem = $derived(SessionClient.problem(name, player));
  // (a name the host refused as taken: another, offered once)
  const offered = $derived(session.taken ? anotherName(session.taken) : null);
  const join = (as: string) => {
    player = as;
    keepPlayerName(store, NAME_KEY, as);
    void session.join(session.lobby, name, as);
  };
</script>

<div class="jam">
  <section aria-labelledby="jam-follow">
    <h4 id="jam-follow">Follow a Jambot session</h4>
    {#if session.status === 'idle'}
      <p class="hint">
        Its host’s section shows here as cells, read only, turning with the host’s transport. Cell studio listens: it plays nothing and sends nothing but its name. The sessions
        open are in the library’s lobby cell; a private one is joined here, by its name.
      </p>
      <label>Session <input bind:value={name} placeholder="its name" autocomplete="off" spellcheck="false" maxlength="40" /></label>
      <label>Your name <input bind:value={player} autocomplete="off" spellcheck="false" /></label>
      <label>Lobby <input bind:value={session.lobby} autocomplete="off" spellcheck="false" /></label>
      <button class="primary" disabled={!!problem} title={problem ?? undefined} onclick={() => join(player)}>Join</button>
      {#if session.ended}<p class="message" role="status">{session.ended}</p>{/if}
      {#if offered}<button class="primary" onclick={() => join(offered)}>Join as {offered}</button>{/if}
    {:else}
      <p class="message" role="status">
        {#if session.status === 'joining'}
          Joining “{session.session}”…
        {:else if session.status === 'rejoining'}
          The link to “{session.session}” dropped: joining again as {session.name}…
        {:else if !session.hostPlaying}
          In “{session.session}” as {session.name}: the host isn’t playing.
        {:else if !studio.following}
          In “{session.session}” as {session.name}: waiting for the host’s first section in cells.
        {:else}
          Following “{session.session}” as {session.name}{#if studio.heard && !studio.heard.before}, bar {studio.heard.bar + 1}{/if}.
        {/if}
        {#if session.hostAway}The host’s link dropped: the lobby holds the session for it.{/if}
      </p>
      {#if session.notice}<p class="message" role="status">{session.notice}</p>{/if}
      {#if session.trip !== null && session.status === 'joined'}<p class="hint">
          The host is {session.trip} ms away and back: the graph is good to {Math.ceil(session.trip / 2)} ms of it.
        </p>{/if}
      <button onclick={() => session.leave()}>Leave</button>
    {/if}
  </section>
</div>

<style>
  .jam {
    display: grid;
    gap: 12px;
  }
  section {
    display: grid;
    gap: 8px;
    padding: 10px 12px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--code-bg);
  }
  h4 {
    margin: 0;
    font: 700 12px var(--font-ui);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
  }
  label {
    display: grid;
    gap: 4px;
    font: 600 12px var(--font-ui);
    color: var(--text-muted);
  }
  input {
    min-height: 36px;
    min-width: 0;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: 600 14px var(--font-ui);
  }
  button {
    min-height: 40px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: 600 14px var(--font-ui);
    text-align: left;
    cursor: pointer;
  }
  button.primary {
    border-color: var(--accent);
  }
  button:disabled {
    color: var(--text-faint);
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .hint {
    margin: 0 4px;
    font: 13px var(--font-ui);
    color: var(--text-muted);
  }
  .message {
    margin: 0 4px;
    font: 13px var(--font-ui);
    color: var(--accent);
    overflow-wrap: anywhere;
  }
</style>
