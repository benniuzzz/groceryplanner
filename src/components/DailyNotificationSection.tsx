import { useCallback, useEffect, useState } from 'react'
import * as api from '../lib/api'
import * as push from '../lib/push'
import { useAppData } from '../hooks/useAppData'
import type { PushSettings } from '../lib/types'
import { btnPrimary, enterStagger } from './ui'
import { InfoTooltip } from './InfoTooltip'
import { TimePicker } from './TimePicker'

export function DailyNotificationSection() {
  const { run } = useAppData()
  const [settings, setSettings] = useState<PushSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [deviceCount, setDeviceCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const deviceTimezone =
    (typeof Intl !== 'undefined' &&
      Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    'UTC'
  const supported = push.pushSupported() && push.vapidConfigured()

  const reload = useCallback(async () => {
    try {
      const [s, count] = await Promise.all([
        api.fetchPushSettings(),
        api.countPushSubscriptions(),
      ])
      setSettings(s)
      setTime(s.time)
      setDeviceCount(count)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load notification settings.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = async (): Promise<boolean> => {
    if (!time) {
      setError('Pick a time for the notification.')
      return false
    }
    setError(null)
    setNotice(null)
    return run(async () => {
      await api.savePushSettings({
        enabled: settings?.enabled ?? false,
        time,
        timezone: deviceTimezone,
      })
    })
  }

  const toggleEnabled = async () => {
    if (!settings || busy) return
    const next = !settings.enabled
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (next) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setError('Notifications are blocked for this site. Allow them in the browser settings for this page, then try again.')
          return
        }
      }
      if (!time) {
        setError('Pick a time for the notification.')
        return
      }
      const ok = await run(async () => {
        await api.savePushSettings({ enabled: next, time, timezone: deviceTimezone })
        if (next) {
          await push.subscribeThisDevice()
        } else {
          await push.unsubscribeThisDevice()
        }
      })
      if (ok) {
        setNotice(
          next
            ? `Daily notification on. This device is registered; other devices need to enable it too.`
            : 'Daily notification off. This device was unregistered.',
        )
        await reload()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { sent } = await api.sendTestPush()
      setNotice(sent > 0 ? `Test sent to ${sent} device${sent === 1 ? '' : 's'}.` : 'No registered devices received the test — enable the toggle first.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test notification failed.')
    } finally {
      setBusy(false)
    }
  }

  const dirty = settings !== null && time !== null && time !== settings.time
  const timeChanged = dirty
    ? 'Time changed — press Save to apply it.'
    : null

  if (loadError) {
    return (
      <section className="animate-fade-up">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Daily meal notification
        </h2>
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {loadError} Run the updated supabase/schema.sql to create the
          notification tables.
        </p>
      </section>
    )
  }

  if (!settings) {
    return null
  }

  return (
    <section
      className="animate-fade-up"
      style={{ animationDelay: '200ms' }}
    >
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Daily meal notification
        <InfoTooltip text="Every morning at the chosen time, installed phones get a push with that day's meals (Breakfast/Lunch/Dinner). Enable it on each device you want to notify." />
      </h2>

      {!supported && (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          This browser can't receive push notifications. Install the app to
          your home screen from Chrome/Edge on Android (or Safari on iOS) and
          try again.
        </p>
      )}

      <div className="mt-4 space-y-4" style={enterStagger(1, 40, 10)}>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Enable daily meal notification"
            disabled={!supported || busy}
            onClick={() => void toggleEnabled()}
            className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
              settings.enabled
                ? 'bg-emerald-600'
                : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                settings.enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
          <span
            className={
              settings.enabled
                ? 'text-sm font-medium text-emerald-700 dark:text-emerald-400'
                : 'text-sm font-medium text-slate-500 dark:text-slate-400'
            }
          >
            {settings.enabled ? 'On' : 'Off'}
          </span>
        </div>

        <label className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Notify at
          </span>
          <TimePicker value={time} onChange={setTime} />
          <button
            className={`${btnPrimary} px-3 py-1.5 text-xs`}
            disabled={!timeChanged || busy}
            onClick={() => void save()}
          >
            Save time
          </button>
        </label>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Schedule timezone: <span className="font-medium">{settings.timezone}</span>
          {timeChanged && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">{timeChanged}</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className={btnPrimary}
            disabled={!supported || busy}
            onClick={() => void test()}
          >
            Send test now
          </button>
          {deviceCount !== null && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {deviceCount} registered device{deviceCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {notice && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>
        )}
      </div>
    </section>
  )
}
