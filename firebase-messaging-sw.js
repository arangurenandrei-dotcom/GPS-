importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD4QzFsYJ8GF2Xgo3GX7LVuhPhTK-Z-kkw",
  authDomain: "gestion-comercial-navarr-3b028.firebaseapp.com",
  projectId: "gestion-comercial-navarr-3b028",
  messagingSenderId: "335117082096",
  appId: "1:335117082096:web:ae8e51ae26457bf29a5135"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  self.registration.showNotification(d.title || 'Konsor Navarra', {
    body: d.body || '',
    tag: d.tag || 'konsor-navarra',
    data: { url: d.url || './' }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(target);
    })
  );
});
