// Noise for noise voices (s=white, s=pink, s=brown).

/** Four seconds of noise of a colour, made once per audio context and colour. */
const noiseBuffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
export function noiseBuffer(ctx: BaseAudioContext, colour: 'white' | 'pink' | 'brown'): AudioBuffer {
  let byColour = noiseBuffers.get(ctx);
  if (!byColour) noiseBuffers.set(ctx, (byColour = new Map()));
  const cached = byColour.get(colour);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * 4);
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    if (colour === 'white') d[i] = w;
    else if (colour === 'pink') {
      // Paul Kellet's filter: -3 dB an octave
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      // brown: the walk, leaky (-6 dB an octave)
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  byColour.set(colour, buf);
  return buf;
}
