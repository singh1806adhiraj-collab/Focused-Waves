// Focused Waves Service Worker for reliable background reminders and notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  
  // Flag that this was an active, authorized click so we do not re-trigger it
  if (notification.data) {
    notification.data.wasClicked = true;
  }
  
  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// Intercept Swipe-to-Dismiss / Clear Actions to make the notification unswipeable
self.addEventListener('notificationclose', (event) => {
  const notification = event.notification;
  const data = notification.data || {};

  // If the notification is marked sticky/requireInteraction/ongoing, and wasn't explicitly clicked:
  if ((data.sticky || data.requireInteraction || data.ongoing) && !data.wasClicked) {
    event.waitUntil(
      self.registration.showNotification(notification.title, {
        body: notification.body,
        tag: notification.tag,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        ongoing: true, // Make it completely non-swipeable / locked in the notification bar
        data: {
          ...data,
          wasClicked: false // Reset clicked status
        },
        actions: [
          { action: 'open', title: '🔓 Open Focused Waves' }
        ]
      })
    );
  }
});

// Handle background notification triggers from the client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, requireInteraction, ongoing } = event.data;
    self.registration.showNotification(title, {
      body: body,
      tag: tag || 'wave-alert',
      requireInteraction: requireInteraction || false,
      ongoing: ongoing || false, // Native flag on Android Chrome to lock the notification
      vibrate: [200, 100, 200],
      badge: '/favicon.ico',
      icon: '/favicon.ico',
      data: {
        sticky: requireInteraction || false,
        ongoing: ongoing || false,
        wasClicked: false
      },
      actions: requireInteraction ? [
        { action: 'open', title: '🔓 Open Focused Waves' }
      ] : []
    });
  }

  if (event.data.type === 'CLOSE_NOTIFICATION') {
    const { tag } = event.data;
    event.waitUntil(
      self.registration.getNotifications({ tag }).then((notifications) => {
        notifications.forEach((notification) => {
          if (notification.data) {
            notification.data.wasClicked = true; // prevent CLOSE triggering recreate
          }
          notification.close();
        });
      })
    );
  }
});
