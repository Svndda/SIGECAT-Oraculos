/**
 * Thin wrapper over the Web Speech API (`window.speechSynthesis`) used by the
 * accessibility widget to read text aloud. Prefers a Spanish voice when the
 * browser offers one. All calls are no-ops when the API is unavailable.
 */

export const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

const pickSpanishVoice = (): SpeechSynthesisVoice | undefined => {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith('es')) ?? voices[0]
  );
};

/** Cancels any ongoing speech and reads `text` aloud. */
export const speak = (text: string): void => {
  if (!isSpeechSupported()) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = 'es-ES';
  const voice = pickSpanishVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
};

/** Stops any ongoing speech. */
export const stopSpeaking = (): void => {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
};
