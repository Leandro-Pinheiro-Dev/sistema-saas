"use client";

import { useEffect, useState } from "react";

export default function EnablePushNotifications() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  // =====================================================
  // VERIFICAR SE JÁ EXISTE UMA INSCRIÇÃO
  // =====================================================

  useEffect(() => {
    const checkPushSubscription = async () => {
      try {
        if (
          !("serviceWorker" in navigator) ||
          !("PushManager" in window) ||
          !("Notification" in window)
        ) {
          return;
        }

        const registration = await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.getSubscription();

        // =================================================
        // JÁ ESTÁ INSCRITO
        // =================================================

        if (subscription) {
          setEnabled(true);

          // Atualiza a assinatura no banco.
          // O upsert evita criar duplicação.
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(subscription),
          });
        }
      } catch (error) {
        console.error("Erro ao verificar inscrição de notificações:", error);
      }
    };

    checkPushSubscription();
  }, []);

  // =====================================================
  // ATIVAR NOTIFICAÇÕES
  // =====================================================

  const enableNotifications = async () => {
    try {
      setLoading(true);

      // =================================================
      // VERIFICAR SUPORTE
      // =================================================

      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        alert("Seu navegador não suporta notificações push.");
        return;
      }

      // =================================================
      // VERIFICAR PERMISSÃO ATUAL
      // =================================================

      let permission: NotificationPermission = Notification.permission;

      // =================================================
      // SE ESTIVER BLOQUEADO
      // =================================================

      if (permission === "denied") {
        alert(
          "As notificações estão bloqueadas no navegador. Ative a permissão nas configurações do navegador.",
        );
        return;
      }

      // =================================================
      // PEDIR PERMISSÃO SOMENTE SE NECESSÁRIO
      // =================================================

      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        alert("As notificações não foram autorizadas.");
        return;
      }

      // =================================================
      // SERVICE WORKER
      // =================================================

      const registration = await navigator.serviceWorker.ready;

      // =================================================
      // CHAVE VAPID
      // =================================================

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada.");
      }

      const applicationServerKey = urlBase64ToArrayBuffer(vapidPublicKey);

      // =================================================
      // VERIFICAR INSCRIÇÃO EXISTENTE
      // =================================================

      let subscription = await registration.pushManager.getSubscription();

      // =================================================
      // CRIAR SOMENTE SE NÃO EXISTIR
      // =================================================

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // =================================================
      // SALVAR / ATUALIZAR NO BANCO
      // =================================================

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar a inscrição.");
      }

      // =================================================
      // ATIVADO
      // =================================================

      setEnabled(true);

      alert("Notificações ativadas com sucesso! 🔔");
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);

      alert("Não foi possível ativar as notificações.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BOTÃO
  // =====================================================

  return (
    <div className="flex w-full justify-end px-4 pt-3 sm:px-5">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={loading || enabled}
        className="
          inline-flex
          h-10
          items-center
          justify-center
          gap-2
          rounded-lg
          border
          border-white
          bg-gray-500
          px-4
          text-sm
          font-medium
          text-white
          shadow-sm
          transition-colors
          hover:bg-gray-600
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {loading
          ? "Ativando..."
          : enabled
            ? "Notificações ativadas ✓"
            : "Ativar notificações 🔔"}
      </button>
    </div>
  );
}

// =====================================================
// CONVERTER CHAVE VAPID
// =====================================================

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);

  const bytes = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }

  return bytes.buffer;
}
