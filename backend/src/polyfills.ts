// Polyfill: Node 18 doesn't expose crypto as a global; @nestjs/typeorm needs it
import { webcrypto } from 'crypto'
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  })
}
