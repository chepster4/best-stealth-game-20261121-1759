// Procedural sound for Lantern Thief: every sound is synthesized with the Web
// Audio API, so the game ships no audio files. Footsteps, a soft pickup chime,
// an alarm sting, a caught thud and a little win arpeggio.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A soft footstep: a short filtered noise tick, quieter while sneaking. */
  function footstep(sneaking) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime;
    const buffer = ac.createBuffer(1, 2205, 44100);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = sneaking ? 320 : 700;
    const amp = ac.createGain();
    amp.gain.setValueAtTime(sneaking ? 0.05 : 0.12, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ac.destination);
    src.start(t0);
  }

  return {
    unlock: ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    footstep,
    relic() {
      tone(880, 0.12, 'sine', 0.14);
      tone(1318, 0.18, 'sine', 0.12, 0.08);
    },
    alarm() {
      tone(220, 0.22, 'sawtooth', 0.12, 0, 330);
      tone(330, 0.22, 'sawtooth', 0.12, 0.2, 220);
    },
    caught() {
      tone(160, 0.35, 'square', 0.14, 0, 70);
    },
    pebble() {
      tone(1200, 0.05, 'sine', 0.06, 0, 700);
    },
    clear() {
      tone(523, 0.14, 'triangle', 0.14);
      tone(659, 0.14, 'triangle', 0.14, 0.12);
      tone(784, 0.24, 'triangle', 0.14, 0.24);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, i * 0.14));
    },
  };
}
