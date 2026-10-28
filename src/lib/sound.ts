let ctx: AudioContext | null = null;

export type Tone = "ok" | "no" | "lift" | "tick" | "go" | "warn" | "zone" | "tap";

function audio() {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(
  ac: AudioContext,
  freq: number,
  at: number,
  dur: number,
  opts: { type?: OscillatorType; vol?: number; slide?: number } = {},
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(freq, at);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, at + dur);
  const vol = opts.vol ?? 0.04;
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function rumble(ac: AudioContext, at: number, dur: number, vol: number) {
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) {
    last = last * 0.92 + (Math.random() * 2 - 1) * 0.08;
    data[i] = last * 4;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0008, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  src.connect(gain);
  gain.connect(ac.destination);
  src.start(at);
}

/** Short chiptune effects. Silent unless sound is on. */
export function playTone(kind: Tone, enabled: boolean) {
  if (!enabled) return;
  try {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    switch (kind) {
      case "ok":
        [523, 659, 784, 1047].forEach((f, i) => blip(ac, f, t + i * 0.07, 0.12));
        break;
      case "no":
        blip(ac, 220, t, 0.18, { type: "sawtooth", slide: 90, vol: 0.05 });
        blip(ac, 150, t + 0.16, 0.25, { type: "sawtooth", slide: 60, vol: 0.05 });
        break;
      case "lift":
        rumble(ac, t, 1.6, 0.18);
        blip(ac, 180, t, 1.2, { type: "triangle", slide: 720, vol: 0.05 });
        break;
      case "tick":
        blip(ac, 440, t, 0.1);
        break;
      case "go":
        blip(ac, 880, t, 0.25);
        rumble(ac, t, 2.2, 0.25);
        break;
      case "warn":
        blip(ac, 1200, t, 0.05, { vol: 0.025 });
        break;
      case "zone":
        [784, 988, 1175, 1568].forEach((f, i) => blip(ac, f, t + i * 0.09, 0.16, { type: "triangle", vol: 0.05 }));
        break;
      case "tap":
        blip(ac, 660, t, 0.04, { vol: 0.02 });
        break;
    }
  } catch {
    /* autoplay or missing audio */
  }
}
