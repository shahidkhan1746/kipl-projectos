"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
if (typeof globalThis.crypto === 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
        value: crypto_1.webcrypto,
        writable: false,
        configurable: true,
    });
}
//# sourceMappingURL=polyfills.js.map