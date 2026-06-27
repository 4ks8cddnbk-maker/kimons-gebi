self.addEventListener("push", (event) => {
  let payload = { title: ".fish", body: "Neue .fish Benachrichtigung" };

  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    payload = { title: ".fish", body: event.data?.text() || "Neue .fish Benachrichtigung" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || ".fish", {
      body: payload.body || "Neue .fish Benachrichtigung",
      icon: "/fish-app-icon.png",
      badge: "/fish-app-icon.png",
      tag: payload.tag || "fish-notification"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/walls"));
});
