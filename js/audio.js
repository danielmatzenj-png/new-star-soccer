// Synthesized Web Audio sound effects matching NSS arcade vibe
const NSSAudio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!enabled) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function tone(freq, duration = 0.1, type = 'square', vol = 0.12, delay = 0) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration);
  }

  function click() {
    tone(660, 0.05, 'triangle', 0.1);
  }

  function kick() {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(42, c.currentTime + 0.11);
    gain.gain.setValueAtTime(0.32, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.12);
  }

  function whistle(long = false) {
    const c = getCtx();
    if (!c) return;
    const dur = long ? 0.55 : 0.22;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2750, c.currentTime);
    osc.frequency.setValueAtTime(2900, c.currentTime + 0.06);
    osc.frequency.setValueAtTime(2720, c.currentTime + 0.12);
    gain.gain.setValueAtTime(0.14, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  }

  function goalCrowd() {
    const c = getCtx();
    if (!c) return;
    // Fanfare arpeggio + white noise crowd cheer
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      tone(f, 0.22, 'sawtooth', 0.12, idx * 0.09);
    });
    const bufferSize = c.sampleRate * 0.9;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.45));
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    const gain = c.createGain();
    gain.gain.value = 0.22;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start();
  }

  function miss() {
    tone(240, 0.15, 'sawtooth', 0.12, 0);
    tone(180, 0.25, 'sawtooth', 0.12, 0.12);
  }

  function postClang() {
    tone(980, 0.18, 'square', 0.18, 0);
    tone(1420, 0.24, 'triangle', 0.12, 0.02);
  }

  function cash() {
    tone(987.77, 0.09, 'square', 0.12, 0);
    tone(1318.51, 0.2, 'square', 0.14, 0.08);
  }

  function levelUp() {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      tone(f, 0.18, 'triangle', 0.16, i * 0.08);
    });
  }

  return {
    toggle,
    isEnabled,
    click,
    kick,
    whistle,
    goalCrowd,
    miss,
    postClang,
    cash,
    levelUp,
  };
})();
