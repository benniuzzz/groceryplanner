/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import type { PrecacheEntry } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | PrecacheEntry)[]
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.skipWaiting()
clientsClaim()

const TODAY_URL = new URL('./?tab=planner', self.location.href).href
const ICON_URL = new URL('./pwa-192x192.png', self.location.href).href

self.addEventListener('push', (event) => {
  let title = 'Grocery Planner'
  let body = 'Tap to see today\u2019s meals.'
  try {
    const payload = event.data?.json() as
      | { title?: string; body?: string }
      | undefined
    if (payload?.title) title = payload.title
    if (payload?.body) body = payload.body
  } catch {
    // keep defaults on unparseable payloads
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: ICON_URL,
      badge: ICON_URL,
      tag: 'daily-meal-plan',
      data: { url: TODAY_URL },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ?? TODAY_URL
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of clients) {
        await client.navigate(url)
        return client.focus()
      }
      return self.clients.openWindow(url)
    })(),
  )
})
