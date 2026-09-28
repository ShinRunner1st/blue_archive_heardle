/**
 * Measures how a voice sounds, for Voice mode's 4-Choice: its pitch (the
 * median and spread of the fundamental frequency, in semitones) and its
 * timbre (the mean MFCCs, the numbers speech tools use for a voice's
 * colour). Lines are decoded by ffmpeg to 16 kHz mono and read here, so the
 * build needs nothing but ffmpeg, as the audio scripts do.
 */
import { spawnSync } from "node:child_process";

const RATE = 16_000;
const FRAME = 1024;
const HOP = 320;
/** Speaking voices, from a low man's to a high child's. */
const MIN_F0 = 70;
const MAX_F0 = 700;
const MEL_BANDS = 26;
const MFCC = 13;

/** The line as samples, 16 kHz mono. */
export function decode(file) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-ac",
      "1",
      "-ar",
      String(RATE),
      "-f",
      "f32le",
      "-",
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg couldn't read ${file}: ${result.stderr}`);
  }
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
}

const HANN = Float64Array.from(
  { length: FRAME },
  (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1))
);

/** In-place radix-2 FFT of a frame, real and imaginary parts. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const step = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const cos = Math.cos(step * k);
        const sin = Math.sin(step * k);
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b] * cos - im[b] * sin;
        const ti = re[b] * sin + im[b] * cos;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

const mel = (hz) => 2595 * Math.log10(1 + hz / 700);
const hz = (m) => 700 * (10 ** (m / 2595) - 1);

/** Triangular mel filters over the FFT's bins, 50 Hz to 8 kHz. */
const FILTERS = (() => {
  const low = mel(50);
  const high = mel(RATE / 2);
  const points = Array.from({ length: MEL_BANDS + 2 }, (_, i) =>
    Math.floor(
      ((FRAME + 1) * hz(low + ((high - low) * i) / (MEL_BANDS + 1))) / RATE
    )
  );
  return Array.from({ length: MEL_BANDS }, (_, band) => {
    const weights = new Float64Array(FRAME / 2 + 1);
    const [a, b, c] = [points[band], points[band + 1], points[band + 2]];
    for (let k = a; k < b; k++) weights[k] = (k - a) / Math.max(b - a, 1);
    for (let k = b; k < c; k++) weights[k] = (c - k) / Math.max(c - b, 1);
    return weights;
  });
})();

/** Mel-frequency cepstral coefficients 1 to 12 of one frame (0 is loudness). */
function mfcc(frame) {
  const re = Float64Array.from(frame, (x, i) => x * HANN[i]);
  const im = new Float64Array(FRAME);
  fft(re, im);
  const power = Float64Array.from(
    { length: FRAME / 2 + 1 },
    (_, k) => re[k] * re[k] + im[k] * im[k]
  );
  const logs = FILTERS.map((weights) => {
    let sum = 0;
    for (let k = 0; k < weights.length; k++) sum += weights[k] * power[k];
    return Math.log(sum + 1e-10);
  });
  return Array.from({ length: MFCC - 1 }, (_, i) => {
    const n = i + 1;
    let sum = 0;
    for (let m = 0; m < MEL_BANDS; m++) {
      sum += logs[m] * Math.cos((Math.PI * n * (m + 0.5)) / MEL_BANDS);
    }
    return sum;
  });
}

/**
 * The fundamental frequency of a frame by YIN, or null where it isn't
 * voiced (breath, noise, a consonant).
 */
function pitch(frame) {
  const minLag = Math.floor(RATE / MAX_F0);
  const maxLag = Math.ceil(RATE / MIN_F0);
  const width = FRAME - maxLag;
  const diff = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < width; i++) {
      const d = frame[i] - frame[i + lag];
      sum += d * d;
    }
    diff[lag] = sum;
  }
  // Cumulative mean normalised difference.
  let running = 0;
  const cmnd = new Float64Array(maxLag + 1);
  cmnd[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += diff[lag];
    cmnd[lag] = running > 0 ? (diff[lag] * lag) / running : 1;
  }
  for (let lag = minLag; lag < maxLag; lag++) {
    if (cmnd[lag] < 0.15) {
      while (lag + 1 < maxLag && cmnd[lag + 1] < cmnd[lag]) lag++;
      // A parabola through the dip, for a pitch between whole lags.
      const [a, b, c] = [cmnd[lag - 1], cmnd[lag], cmnd[lag + 1]];
      const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
      return RATE / (lag + shift);
    }
  }
  return null;
}

/** Semitones above A4, so pitch differences read the same high or low. */
const semitones = (f0) => 12 * Math.log2(f0 / 440);

function quantile(sorted, q) {
  const at = (sorted.length - 1) * q;
  const low = Math.floor(at);
  return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
}

/**
 * A voice's measures, from all of a student's lines: the pitch's median and
 * spread (interquartile range) in semitones, and the timbre as the mean of
 * each MFCC over the voiced frames.
 */
export function measureVoice(files) {
  const pitches = [];
  const sums = new Float64Array(MFCC - 1);
  let voiced = 0;

  for (const file of files) {
    const samples = decode(file);
    const frames = [];
    for (let start = 0; start + FRAME <= samples.length; start += HOP) {
      frames.push(samples.subarray(start, start + FRAME));
    }
    const loudness = frames.map((frame) =>
      Math.sqrt(frame.reduce((sum, x) => sum + x * x, 0) / FRAME)
    );
    const loudest = Math.max(...loudness, 0);
    frames.forEach((frame, index) => {
      // Quiet frames are breath or room: they say nothing of the voice.
      if (loudness[index] < Math.max(loudest * 0.1, 1e-3)) return;
      const f0 = pitch(frame);
      if (f0 === null) return;
      pitches.push(semitones(f0));
      mfcc(frame).forEach((value, i) => (sums[i] += value));
      voiced += 1;
    });
  }

  if (voiced === 0) return null;
  pitches.sort((a, b) => a - b);
  return {
    pitch: quantile(pitches, 0.5),
    spread: quantile(pitches, 0.75) - quantile(pitches, 0.25),
    timbre: Array.from(sums, (sum) => sum / voiced),
    frames: voiced,
  };
}
