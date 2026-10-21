<script lang="ts">
  /**
   * Jam, a page of the sidebar: follow a Jambot session (#478, rung 1). Its lobby (the hosted one by default), the
   * session's name and yours; joined, the host's section is the piece, read only, its graph turning with the host's
   * transport, and nothing is played or sent but the join, the pings and the leave (state/session.svelte.ts). Leaving
   * keeps the last section open, yours to change.
   */
  import { HOSTED_LOBBY } from '../session/protocol';
  import { SessionClient } from './state/session.svelte';
  import { getStudio } from './state/studio.svelte';

  const studio = getStudio();
  const { session } = studio;
  let lobby = $state(HOSTED_LOBBY);
  let name = $state(session.session ?? '');
  let player = $state(session.name ?? 'Cell studio');
  const problem = $derived(SessionClient.problem(name, player));
</script>

<div class="jam">
  <section aria-labelledby="jam-follow">
    <h4 id="jam-follow">Follow a Jambot session</h4>
    {#if session.status === 'idle'}
      <p class="hint">
        Its host’s section shows here as cells, read only, turning with the host’s transport. Cell studio listens: it plays nothing and sends nothing but its name.
      </p>
      <label>Session <input bind:value={name} placeholder="its name" autocomplete="off" spellcheck="false" maxlength="40" /></label>
      <label>Your name <input bind:value={player} autocomplete="off" spellcheck="false" /></label>
      <label>Lobby <input bind:value={lobby} autocomplete="off" spellcheck="false" /></label>
      <button class="primary" disabled={!!problem} title={problem ?? undefined} onclick={() => session.join(lobby, name, player)}>Join</button>
      {#if session.ended}<p class="message" role="status">{session.ended}</p>{/if}
    {:else}
      <p class="message" role="status">
        {#if session.status === 'joining'}
          Joining “{session.session}”…
        {:else if !session.hostPlaying}
          In “{session.session}” as {session.name}: the host isn’t playing.
        {:else if !studio.following}
          In “{session.session}” as {session.name}: waiting for the host’s first section in cells.
        {:else}
          Following “{session.session}” as {session.name}{#if studio.heard && !studio.heard.before}, bar {studio.heard.bar + 1}{/if}.
        {/if}
        {#if session.hostAway}The host’s link dropped: the lobby holds the session for it.{/if}
      </p>
      {#if session.trip !== null}<p class="hint">The host is {session.trip} ms away and back: the graph is good to {Math.ceil(session.trip / 2)} ms of it.</p>{/if}
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
