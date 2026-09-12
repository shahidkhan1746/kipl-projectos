import { AuthController } from './auth.controller'

/**
 * Which refresh token wins when a caller presents two.
 *
 * A browser holding a leftover token in localStorage posts it in the body while
 * also sending the live httpOnly cookie. The body used to win. Since an expired
 * token in the database is treated as replay, and replay revokes every token the
 * user has, the leftover destroyed the valid session arriving beside it.
 */
describe('AuthController: where the refresh token is read from', () => {
  const session = { access_token: 'a', refresh_token: 'rotated', user: { id: 'u1' } }

  function build() {
    const seen: string[] = []
    const service = {
      refresh: (token: string) => { seen.push(token); return Promise.resolve(session) },
      logout: (token: string) => { seen.push(token); return Promise.resolve(undefined) },
    }
    const controller = new AuthController(service as never)
    const res = { cookie: () => undefined, clearCookie: () => undefined } as never
    return { controller, res, seen }
  }

  const reqWith = (cookie?: string) => ({ headers: cookie ? { cookie } : {} }) as never

  it('prefers the cookie when the body also carries one', async () => {
    const { controller, res, seen } = build()
    await controller.refresh(
      { refresh_token: 'stale-from-localstorage' },
      reqWith('kipl_refresh=live-cookie-token'),
      res,
    )
    expect(seen).toEqual(['live-cookie-token'])
  })

  it('falls back to the body for a caller with no cookie jar, as the mobile app has none', async () => {
    const { controller, res, seen } = build()
    await controller.refresh({ refresh_token: 'mobile-token' }, reqWith(), res)
    expect(seen).toEqual(['mobile-token'])
  })

  it('reads the cookie when the body is empty', async () => {
    const { controller, res, seen } = build()
    await controller.refresh({}, reqWith('kipl_refresh=live-cookie-token'), res)
    expect(seen).toEqual(['live-cookie-token'])
  })

  it('passes an empty string on when the caller presented nothing', async () => {
    const { controller, res, seen } = build()
    await controller.refresh({}, reqWith(), res)
    expect(seen).toEqual([''])
  })

  it('finds the cookie alongside others in the header', async () => {
    const { controller, res, seen } = build()
    await controller.refresh(
      { refresh_token: 'stale' },
      reqWith('theme=dark; kipl_refresh=live-cookie-token; other=1'),
      res,
    )
    expect(seen).toEqual(['live-cookie-token'])
  })

  it('applies the same precedence to logout, which revokes what it is given', async () => {
    const { controller, res, seen } = build()
    await controller.logout({ refresh_token: 'stale' }, reqWith('kipl_refresh=live-cookie-token'), res)
    expect(seen).toEqual(['live-cookie-token'])
  })
})
