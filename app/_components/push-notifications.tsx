"use client";

import { useEffect } from "react";

export default function PushNotifications() {
  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) {
        console.log("Service Worker não é suportado.");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        console.log("Service Worker registrado:", registration.scope);
      } catch (error) {
        console.error("Erro ao registrar Service Worker:", error);
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}
