// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// jsdom does not implement the Web Speech API. Stub the whole surface so the
// module can be imported and the timing contract can be verified.
const cancelMock = vi.fn();
const speakMock = vi.fn();
const resumeMock = vi.fn();
const getVoicesMock = vi.fn(() => []);

vi.stubGlobal('SpeechSynthesisUtterance', class {
  text: string; lang = ''; voice: unknown = null;
  constructor(text: string) { this.text = text; }
});

vi.stubGlobal('speechSynthesis', {
  cancel: cancelMock,
  speak: speakMock,
  resume: resumeMock,
  paused: false,
  getVoices: getVoicesMock,
  addEventListener: vi.fn(),
});

const { isSpeechSupported, speak, stopSpeaking } = await import('./speech');

describe('speech utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('isSpeechSupported returns true when speechSynthesis is available', () => {
    expect(isSpeechSupported()).toBe(true);
  });

  it('speak fires cancel immediately then speaks after the Chrome-race delay', () => {
    speak('hola mundo');
    // cancel must fire synchronously, before the utterance
    expect(cancelMock).toHaveBeenCalledTimes(1);
    // speak has NOT been called yet (it is inside the 100ms setTimeout)
    expect(speakMock).not.toHaveBeenCalled();
    // advance timers past the 100ms delay
    vi.runAllTimers();
    expect(speakMock).toHaveBeenCalledTimes(1);
    const utt = speakMock.mock.calls[0][0] as { text: string; lang: string };
    expect(utt.text).toBe('hola mundo');
    expect(utt.lang).toBe('es-CR');
  });

  it('speak is a no-op for empty or whitespace-only text', () => {
    speak('   ');
    vi.runAllTimers();
    expect(cancelMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it('stopSpeaking cancels synthesis without speaking', () => {
    stopSpeaking();
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(speakMock).not.toHaveBeenCalled();
  });
});
