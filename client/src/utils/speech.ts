/**
 * Thin wrapper over the Web Speech API (`window.speechSynthesis`) used by the
 * accessibility widget to read text aloud. Prefers a Spanish voice when the
 * browser offers one. All calls are no-ops when the API is unavailable.
 *
 * Browser quirks handled here:
 * - Chrome/Edge load voices asynchronously; getVoices() returns [] until the
 *   `voiceschanged` event fires. We cache voices once they arrive and fall back
 *   to the utterance `lang` hint (which is enough for the browser to pick a
 *   Spanish voice without an explicit voice object).
 * - Chrome has a known bug where cancel() followed by speak() immediately can
 *   leave the synthesis queue stuck. A short setTimeout after cancel() works
 *   around it reliably.
 * - Chrome sometimes pauses synthesis after the page regains focus or after a
 *   long idle period; calling resume() before speak() prevents silent hangs.
 */

export const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

// Cached voice list, populated once voiceschanged fires (Chrome/Edge).
let cachedVoices: SpeechSynthesisVoice[] = [];

const loadVoices = (): void => {
  if (!isSpeechSupported()) return;
  cachedVoices = window.speechSynthesis.getVoices();
};

if (isSpeechSupported()) {
  loadVoices();
  // Chrome fires voiceschanged when the list is ready; Firefox populates
  // synchronously so this may fire immediately or not at all.
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

const pickSpanishVoice = (): SpeechSynthesisVoice | undefined => {
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith('es')) ?? voices[0];
};

/**
 * Cancels any ongoing speech and reads `text` aloud.
 * Works around the Chrome cancel+speak race with a short delay.
 */
export const speak = (text: string): void => {
  if (!isSpeechSupported()) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  window.speechSynthesis.cancel();

  // Chrome bug: cancel() + immediate speak() leaves the queue stuck.
  // A 100ms delay is imperceptible to users and reliably clears the hang.
  setTimeout(() => {
    // Chrome also pauses synthesis on idle/focus loss; resume first.
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = 'es-CR'; // Costa Rican Spanish hint for voice selection.
    const voice = pickSpanishVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }, 100);
};

/** Stops any ongoing speech. */
export const stopSpeaking = (): void => {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
};
