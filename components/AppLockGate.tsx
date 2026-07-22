import { FormEvent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import {
  APP_LOCK_CONFIG_KEY,
  APP_LOCK_STATE_KEY,
  readAppLockConfig,
  verifyAppLockPin,
} from '../infrastructure/appLock';

const LOCK_EVENT = 'netcatty:app-lock';

function writeLocked(locked: boolean) {
  window.localStorage.setItem(APP_LOCK_STATE_KEY, JSON.stringify({ locked, at: Date.now() }));
  window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: { locked } }));
}

function readLocked(): boolean {
  try {
    return JSON.parse(window.localStorage.getItem(APP_LOCK_STATE_KEY) || 'null')?.locked === true;
  } catch {
    return false;
  }
}

export function lockNetcatty() {
  if (readAppLockConfig()) writeLocked(true);
}

export function AppLockGate({ children }: PropsWithChildren) {
  const [config, setConfig] = useState(() => readAppLockConfig());
  const [locked, setLocked] = useState(() => Boolean(readAppLockConfig()));
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const timeoutMs = useMemo(() => (config?.timeoutMinutes || 0) * 60_000, [config]);

  const refreshConfig = useCallback(() => {
    const next = readAppLockConfig();
    setConfig(next);
    if (!next) setLocked(false);
  }, []);

  useEffect(() => {
    const onLock = (event: Event) => {
      refreshConfig();
      if ((event as CustomEvent<{ locked?: boolean }>).detail?.locked !== false) setLocked(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === APP_LOCK_CONFIG_KEY) refreshConfig();
      if (event.key === APP_LOCK_STATE_KEY) setLocked(readLocked());
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        lockNetcatty();
      }
    };
    window.addEventListener(LOCK_EVENT, onLock);
    window.addEventListener('storage', onStorage);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener(LOCK_EVENT, onLock);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [refreshConfig]);

  useEffect(() => {
    if (!config || locked || !timeoutMs) return;
    let timer = window.setTimeout(() => lockNetcatty(), timeoutMs);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => lockNetcatty(), timeoutMs);
    };
    window.addEventListener('pointerdown', reset, true);
    window.addEventListener('keydown', reset, true);
    window.addEventListener('mousemove', reset, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', reset, true);
      window.removeEventListener('keydown', reset, true);
      window.removeEventListener('mousemove', reset, true);
    };
  }, [config, locked, timeoutMs]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!config || !(await verifyAppLockPin(pin, config))) {
      setError('PIN 不正确');
      setPin('');
      return;
    }
    setPin('');
    setError('');
    setLocked(false);
    writeLocked(false);
  };

  return (
    <>
      {children}
      {locked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 text-slate-100" role="dialog" aria-modal="true" aria-label="Netcatty 已锁定">
          <form className="w-[320px] rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onSubmit={unlock}>
            <h1 className="text-xl font-semibold">Netcatty 已锁定</h1>
            <p className="mt-2 text-sm text-slate-400">输入 PIN 后继续使用 SSH 工作区。</p>
            <input autoFocus inputMode="numeric" minLength={4} maxLength={32} type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} className="mt-5 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-center tracking-[0.5em] outline-none focus:border-blue-400" placeholder="PIN" />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <button className="mt-4 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500" type="submit">解锁</button>
          </form>
        </div>
      )}
    </>
  );
}
