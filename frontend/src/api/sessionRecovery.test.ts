import { describe, expect, it, vi } from 'vitest'
import { createSessionRecovery } from './sessionRecovery'

describe('session recovery', () => {
  it('waits for readiness and shares a single rotating POST', async () => {
    let ready!: (value: boolean) => void
    const check = vi.fn(() => new Promise<boolean>(resolve => { ready = resolve }))
    const send = vi.fn(async () => 'session')
    const recover = createSessionRecovery('', send, check)
    const first = recover()
    expect(recover()).toBe(first)
    expect(send).not.toHaveBeenCalled()
    ready(true)
    expect(await first).toBe('session')
    expect(send).toHaveBeenCalledTimes(1)
    expect(check).toHaveBeenCalledTimes(1)
  })

  it('does not send credentials when readiness fails', async () => {
    const send = vi.fn(async () => 'session')
    const recover = createSessionRecovery('', send, async () => false)
    await expect(recover()).rejects.toThrow('saved session has not been cleared')
    expect(send).not.toHaveBeenCalled()
  })

  it('does not replay a failed POST; allows a later explicit retry', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce('session')
    const recover = createSessionRecovery('', send, async () => true)
    await expect(recover()).rejects.toThrow('timeout')
    expect(send).toHaveBeenCalledTimes(1)
    expect(await recover()).toBe('session')
    expect(send).toHaveBeenCalledTimes(2)
  })
})
