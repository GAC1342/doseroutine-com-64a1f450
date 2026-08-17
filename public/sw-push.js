// DoseRoutine push notification service worker.
// Dedicated messaging worker (exempt from the app-shell SW ban). Does not
// cache HTML/assets — only handles `push` and `notificationclick`.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "DoseRoutine", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Time for your dose";
  const options = {
    body: payload.body || "",
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    tag: payload.tag || "doseroutine-reminder",
    data: { url: payload.url || "/today" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/today";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            await client.navigate(target);
            return;
          }
        } catch {}
      }
      await self.clients.openWindow(target);
    })(),
  );
});
