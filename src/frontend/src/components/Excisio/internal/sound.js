/**
 * Lazily creates (or reuses) the shared AudioContext held in `ref.current`. Returns null in
 * environments without Web Audio (e.g. jsdom in tests) so callers can no-op safely.
 * @param {{current: AudioContext|null}} ref
 * @returns {AudioContext|null}
 */
function ensureAudioContext(ref) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!ref.current) ref.current = new AudioContextCtor();
  if (ref.current.state === 'suspended') ref.current.resume();
  return ref.current;
}

/**
 * Dissonant descending stinger + shrill shimmer + low boom, played when a diagnosis leaves
 * tumor tissue behind or the margin is positive.
 * @param {{current: AudioContext|null}} audioContextRef
 */
export function playScarySting(audioContextRef) {
  try {
    const ac = ensureAudioContext(audioContextRef);
    if (!ac) return;
    const t = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
    master.gain.exponentialRampToValueAtTime(0.28, t + 0.4);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);

    [110, 116.5, 155].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 1.5);
      g.gain.value = 0.5 - i * 0.12;
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 1.7);
    });

    const hi = ac.createOscillator();
    const hg = ac.createGain();
    hi.type = 'square';
    hi.frequency.setValueAtTime(1760, t);
    hi.frequency.linearRampToValueAtTime(1500, t + 1.4);
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    lfo.frequency.value = 13;
    lg.gain.value = 140;
    lfo.connect(lg);
    lg.connect(hi.frequency);
    hg.gain.value = 0.09;
    hi.connect(hg);
    hg.connect(master);
    lfo.start(t);
    hi.start(t);
    hi.stop(t + 1.5);
    lfo.stop(t + 1.5);

    const b = ac.createOscillator();
    const bg = ac.createGain();
    b.type = 'sine';
    b.frequency.setValueAtTime(70, t);
    b.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    bg.gain.setValueAtTime(0.6, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    b.connect(bg);
    bg.connect(ac.destination);
    b.start(t);
    b.stop(t + 1.3);
  } catch (_error) {
    // Web Audio being unavailable/blocked must never break the game.
  }
}

/**
 * Short triumphant staccato riff, played on a near-perfect excision result.
 * @param {{current: AudioContext|null}} audioContextRef
 */
export function playFanfare(audioContextRef) {
  try {
    const ac = ensureAudioContext(audioContextRef);
    if (!ac) return;
    const t0 = ac.currentTime + 0.05;
    const bus = ac.createGain();
    bus.gain.value = 0.34;
    bus.connect(ac.destination);

    const chord = (root, t, dur, gain) => {
      [1, 1.5, 2].forEach((mult, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(root * mult, t);
        const gv = (gain || 0.3) * (i === 0 ? 1 : 0.55);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gv, t + 0.012);
        g.gain.exponentialRampToValueAtTime(gv * 0.6, t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(bus);
        o.start(t);
        o.stop(t + dur + 0.02);
      });
    };

    const notes = { C: 130.81, Eb: 155.56, F: 174.61, G: 196.0, Ab: 207.65, Bb: 233.08, Cx: 261.63 };
    const beat = 0.19;
    [0, 1, 2].forEach((i) => chord(notes.C, t0 + i * beat, beat * 0.85, 0.28));
    const sequence = [
      [notes.C, 3, 1], [notes.Bb, 4.4, 1], [notes.Ab, 5.8, 1], [notes.G, 7.2, 1.2], [notes.C, 8.8, 2.4],
    ];
    sequence.forEach(([f, beatOffset, len]) => chord(f, t0 + beatOffset * beat, len * beat, 0.34));

    const ht = t0 + 8.8 * beat;
    [notes.Cx * 2, notes.Cx * 3].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, ht);
      g.gain.setValueAtTime(0.0001, ht);
      g.gain.exponentialRampToValueAtTime(0.12 - i * 0.04, ht + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ht + 2.2);
      o.connect(g);
      g.connect(bus);
      o.start(ht);
      o.stop(ht + 2.3);
    });

    sequence.forEach(([, beatOffset]) => {
      const t = t0 + beatOffset * beat;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch (_error) {
    // Web Audio being unavailable/blocked must never break the game.
  }
}
