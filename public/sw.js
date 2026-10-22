// =====================================================
// SERVICE WORKER - NOTIFICAÇÕES PUSH
// SpaçoVip Barbearia
// =====================================================

// -----------------------------------------------------
// RECEBER NOTIFICAÇÃO PUSH
// -----------------------------------------------------

self.addEventListener("push", (event) => {
  let data = {}

  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {
      title: "SpaçoVip Barbearia",
      body: event.data?.text() || "Você recebeu uma nova notificação.",
    }
  }

  const title = data.title || "SpaçoVip Barbearia"

  const options = {
    body: data.body || "Você recebeu uma nova notificação.",

    // Ícone do PWA
    icon: "/icon_192.jpg",
    badge: "/icon_192.jpg",

    // Vibração
    vibrate: [200, 100, 200, 100, 300],

    // Dados usados quando o usuário toca na notificação
    data: {
      url: data.url || "/",
    },

    // A notificação continua visível até o usuário interagir
    requireInteraction: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// -----------------------------------------------------
// CLIQUE NA NOTIFICAÇÃO
// -----------------------------------------------------

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/"

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Se o SpaçoVip já estiver aberto,
        // tenta reutilizar a janela existente.
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url)
            return client.focus()
          }
        }

        // Caso não esteja aberto, abre o endereço.
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      }),
  )
})
