importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  projectId: "gootff-dcc2a",
  messagingSenderId: "1027459267887",
  appId: "1:1027459267887:android:ecb608f8a39f58e8bf75da"
});

const messaging = firebase.messaging();
