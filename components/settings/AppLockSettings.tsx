import { FormEvent, useState } from 'react';
import { APP_LOCK_CONFIG_KEY, APP_LOCK_STATE_KEY, createAppLockConfig, readAppLockConfig } from '../../infrastructure/appLock';
import { Button } from '../ui/button';
import { SectionHeader, SettingCard } from './settings-ui';

export function AppLockSettings() {
  const initialConfig = readAppLockConfig();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [timeoutMinutes, setTimeoutMinutes] = useState(String(initialConfig?.timeoutMinutes ?? 5));
  const [message, setMessage] = useState(initialConfig ? '应用锁已启用' : '应用锁未启用');
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,32}$/.test(pin)) {
      setMessage('PIN 必须是 4 至 32 位数字');
      return;
    }
    if (pin !== confirmPin) {
      setMessage('两次输入的 PIN 不一致');
      return;
    }
    setSaving(true);
    try {
      const config = await createAppLockConfig(pin, Number(timeoutMinutes));
      window.localStorage.setItem(APP_LOCK_CONFIG_KEY, JSON.stringify(config));
      window.localStorage.setItem(APP_LOCK_STATE_KEY, JSON.stringify({ locked: true, at: Date.now() }));
      window.dispatchEvent(new CustomEvent('netcatty:app-lock', { detail: { locked: true } }));
      setPin('');
      setConfirmPin('');
      setMessage('应用锁已启用。请使用新 PIN 解锁。');
    } finally {
      setSaving(false);
    }
  };

  const disable = () => {
    window.localStorage.removeItem(APP_LOCK_CONFIG_KEY);
    window.localStorage.removeItem(APP_LOCK_STATE_KEY);
    window.dispatchEvent(new CustomEvent('netcatty:app-lock', { detail: { locked: false } }));
    setMessage('应用锁已关闭');
  };

  return (
    <>
      <SectionHeader title="应用锁" />
      <SettingCard className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">使用 PIN 防止他人在已登录的 Windows 电脑上操作 Netcatty。快捷键：Ctrl + Shift + L。</p>
        <form className="space-y-3" onSubmit={save}>
          <div className="grid gap-2 sm:grid-cols-2">
            <input inputMode="numeric" type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="设置 PIN（至少 4 位）" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <input inputMode="numeric" type="password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} placeholder="确认 PIN" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">无操作自动锁定</label>
            <select value={timeoutMinutes} onChange={(event) => setTimeoutMinutes(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
              <option value="1">1 分钟</option><option value="5">5 分钟</option><option value="15">15 分钟</option><option value="30">30 分钟</option>
            </select>
            <Button size="sm" type="submit" disabled={saving}>{initialConfig ? '更新 PIN' : '启用应用锁'}</Button>
            {initialConfig && <Button size="sm" variant="outline" type="button" onClick={disable}>关闭应用锁</Button>}
          </div>
          <p className="text-xs text-muted-foreground">{message}</p>
        </form>
      </SettingCard>
    </>
  );
}
