/**
 * Audio and Haptics Service
 * Provides instant tactile feedback (vibration) and a clean scanner 'beep'
 * using standard Web Audio API and Navigator Vibration API.
 */

let audioCtx: AudioContext | null = null;

export function playScanFeedback(enableSound = true, enableHaptics = true) {
  // 1. Haptic feedback (vibração curta de 40ms, equivalente a HapticFeedback.lightImpact())
  if (enableHaptics && typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(40);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }

  // 2. Audio feedback (Bip clássico e nítido de leitor óptico)
  if (enableSound && typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, audioCtx.currentTime); // 1850Hz: Tom clássico de leitor de caixa
      osc.frequency.exponentialRampToValueAtTime(2200, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export function playSuccessSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.06); // E5

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.14);
  } catch {
    // Ignore audio error
  }
}
