importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBzaEUrY6MX38n3s7KcIfcx2mhqQbOCfCY",
  authDomain: "gootff-dcc2a.firebaseapp.com",
  projectId: "gootff-dcc2a",
  storageBucket: "gootff-dcc2a.firebasestorage.app",
  messagingSenderId: "1027459267887",
  appId: "1:1027459267887:android:ecb608f8a39f58e8bf75da"
});

const messaging = firebase.messaging();
