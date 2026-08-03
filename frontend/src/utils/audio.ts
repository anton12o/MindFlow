export function ensureAudioCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext {
  if (!ref.current) {
    ref.current = new AudioContext()
  } else if (ref.current.state === 'suspended') {
    ref.current.resume()
  }
  return ref.current
}

export function playAlarm(ctx: AudioContext) {
  const run = () => {
    try {
      const freqs = [660, 880, 1040]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'square'
        const t = ctx.currentTime + i * 0.15
        gain.gain.setValueAtTime(0.25, t)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2)
        osc.start(t)
        osc.stop(t + 0.2)
      })
    } catch (e) { console.error('[audio] playAlarm', e) }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(run)
  } else {
    run()
  }
}

export function playBeep(ctx: AudioContext) {
  const run = () => {
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      const t = ctx.currentTime
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08)
      osc.start(t)
      osc.stop(t + 0.1)
    } catch (e) { console.error('[audio] playBeep', e) }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(run)
  } else {
    run()
  }
}
