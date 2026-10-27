/** A short, soft beep for when a rest timer ends while the app is on screen
 *  (in the background the phone's notification sound is used instead).
 *  Best-effort: browsers may block audio without a recent tap. */
export function playBeep(): void {
  try {
    const AudioContextClass = window.AudioContext
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.4)
    oscillator.onended = () => {
      void context.close()
    }
  } catch {
    // No audio available — the notification still alerts.
  }
}
