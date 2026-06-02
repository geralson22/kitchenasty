let audio: HTMLAudioElement | null = null;

function generateBellWav(): string {
  const sampleRate = 44100;
  const duration = 1.2;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const frequencies = [830, 1660, 2490, 3320];
  const amplitudes = [1.0, 0.5, 0.25, 0.125];

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 4.5);
    let sample = 0;
    for (let f = 0; f < frequencies.length; f++) {
      sample += Math.sin(2 * Math.PI * frequencies[f] * t) * amplitudes[f];
    }
    sample *= envelope * 0.35;
    view.setInt16(offset, sample * 32767, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function playNewOrderSound() {
  try {
    if (!audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.src = generateBellWav();
    }
    audio.currentTime = 0;
    audio.play().catch(() => {
      const a = new Audio(generateBellWav());
      a.play().catch(() => {});
    });
  } catch (e) {
    console.error('Audio playback failed:', e);
  }
}
