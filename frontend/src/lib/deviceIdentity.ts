/**
 * Enterprise Adaptive Device Recognition & Fingerprinting
 *
 * Provides persistent cryptographic device identification, hardware-level
 * canvas/WebGL/screen fingerprinting, and friendly device naming without
 * relying on blocked OS APIs (e.g. MAC address / Wi-Fi SSID).
 */

const STORAGE_KEY = 'kipl_device_id';
const IDB_NAME = 'kipl_identity_db';
const IDB_STORE = 'device_store';

/**
 * Fast synchronous fallback hash (djb2) if crypto.subtle is unavailable.
 */
function fastHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Computes SHA-256 hash or falls back to fastHash.
 */
async function hashString(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to fastHash
    }
  }
  return fastHash(input);
}

/**
 * Generates a standard cryptographically random UUID v4.
 */
function generateUuid(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Persists device ID into IndexedDB for resilience against localStorage clearing.
 */
function persistToIndexedDb(id: string): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve();
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(id, 'device_id');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieves device ID from IndexedDB.
 */
function readFromIndexedDb(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.close();
          return resolve(null);
        }
        const tx = db.transaction(IDB_STORE, 'readonly');
        const getReq = tx.objectStore(IDB_STORE).get('device_id');
        getReq.onsuccess = () => {
          db.close();
          resolve((getReq.result as string) || null);
        };
        getReq.onerror = () => {
          db.close();
          resolve(null);
        };
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Gets or initializes the persistent device UUID.
 */
export async function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return 'server-side-client';

  // 1. Check localStorage first
  let id = localStorage.getItem(STORAGE_KEY);
  if (id && id.trim().length >= 10) {
    persistToIndexedDb(id).catch(() => {});
    return id.trim();
  }

  // 2. Check IndexedDB backup
  const idbId = await readFromIndexedDb();
  if (idbId && idbId.trim().length >= 10) {
    localStorage.setItem(STORAGE_KEY, idbId.trim());
    return idbId.trim();
  }

  // 3. Generate fresh device UUID
  id = `kipl_dev_${generateUuid()}`;
  localStorage.setItem(STORAGE_KEY, id);
  await persistToIndexedDb(id).catch(() => {});
  return id;
}

/**
 * Synchronously returns device ID from localStorage (or generates immediately).
 */
export function getDeviceIdSync(): string {
  if (typeof window === 'undefined') return 'server-side-client';
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id || id.trim().length < 10) {
    id = `kipl_dev_${generateUuid()}`;
    localStorage.setItem(STORAGE_KEY, id);
    persistToIndexedDb(id).catch(() => {});
  }
  return id.trim();
}

/**
 * Renders a hidden canvas to gather hardware rasterization characteristics.
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('KIPL ProjectOS ⚙️ 2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Secure Device Identity', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-blocked';
  }
}

/**
 * Gathers WebGL GPU renderer and vendor strings.
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      return `${vendor}~${renderer}`;
    }
    return gl.getParameter(gl.RENDERER) || 'generic-webgl';
  } catch {
    return 'webgl-blocked';
  }
}

/**
 * Computes a stable multi-signal hardware/browser fingerprint.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server-side';

  const components: string[] = [
    navigator.userAgent || '',
    navigator.language || '',
    (navigator as any).hardwareConcurrency ? String((navigator as any).hardwareConcurrency) : '',
    (navigator as any).deviceMemory ? String((navigator as any).deviceMemory) : '',
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    getCanvasFingerprint(),
    getWebGLFingerprint(),
  ];

  return hashString(components.join('###'));
}

/**
 * Generates a human-friendly name for this device (e.g., "Chrome on Windows").
 */
export function getFriendlyDeviceName(): string {
  if (typeof window === 'undefined') return 'Web Client';

  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';

  let os = 'Unknown OS';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
    os = (navigator as any).maxTouchPoints > 1 ? 'iPad' : 'macOS';
  } else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

export interface DevicePayload {
  deviceId: string;
  deviceName: string;
  deviceFingerprint: string;
}

/**
 * Combines device ID, friendly name, and fingerprint for auth requests.
 */
export async function getDevicePayload(): Promise<DevicePayload> {
  const [deviceId, deviceFingerprint] = await Promise.all([
    getDeviceId(),
    getDeviceFingerprint(),
  ]);

  return {
    deviceId,
    deviceName: getFriendlyDeviceName(),
    deviceFingerprint,
  };
}
