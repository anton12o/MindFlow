let source: AudioBufferSourceNode | null = null
let gainNode: GainNode | null = null
let ctx: AudioContext | null = null

function createNoiseBuffer(ctx: AudioContext, duration: number) {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    // Pink noise approximation
    const white = Math.random() * 2 - 1
    data[i] = white * 0.5
  }
  return buffer
}

export function startAmbient(audioCtx: AudioContext) {
  if (source) return
  ctx = audioCtx
  gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.08, ctx.currentTime)
  gainNode.connect(ctx.destination)

  const buffer = createNoiseBuffer(ctx, 4)
  source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(400, ctx.currentTime)
  filter.Q.setValueAtTime(1, ctx.currentTime)

  source.connect(filter)
  filter.connect(gainNode)
  source.start()
}

export function stopAmbient() {
  try {
    source?.stop()
    source?.disconnect()
  } catch { /* already stopped */ }
  gainNode?.disconnect()
  source = null
  gainNode = null
  ctx = null
}
