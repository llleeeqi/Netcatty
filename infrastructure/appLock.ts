export const APP_LOCK_CONFIG_KEY = 'netcatty_app_lock_v1';
export const APP_LOCK_STATE_KEY = 'netcatty_app_lock_state_v1';

export type AppLockConfig = {
  salt: string;
  verifier: string;
  timeoutMinutes: number;
};

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

async function derive(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 200_000 },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export async function createAppLockConfig(pin: string, timeoutMinutes: number): Promise<AppLockConfig> {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, verifier: await derive(pin, salt), timeoutMinutes };
}

export async function verifyAppLockPin(pin: string, config: AppLockConfig): Promise<boolean> {
  return (await derive(pin, config.salt)) === config.verifier;
}

export function readAppLockConfig(): AppLockConfig | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(APP_LOCK_CONFIG_KEY) || 'null');
    if (!parsed || typeof parsed.salt !== 'string' || typeof parsed.verifier !== 'string') return null;
    const timeoutMinutes = Number(parsed.timeoutMinutes);
    if (!Number.isFinite(timeoutMinutes) || timeoutMinutes < 1) return null;
    return { salt: parsed.salt, verifier: parsed.verifier, timeoutMinutes };
  } catch {
    return null;
  }
}
