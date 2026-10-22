"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const isPwaInstalled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const standalone = window.matchMedia("(display-mode: standalone)").matches;

  const iosStandalone =
    (
      window.navigator as Navigator & {
        standalone?: boolean;
      }
    ).standalone === true;

  return standalone || iosStandalone;
};

const isIOSDevice = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const InstallPwaButton = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState(isPwaInstalled);

  const [isIOS] = useState(isIOSDevice);

  useEffect(() => {
    /**
     * Chrome/Edge dispara este evento quando
     * o aplicativo pode ser instalado.
     */
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    /**
     * Disparado pelo navegador depois que
     * o PWA foi instalado.
     */
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  /**
   * Abre o prompt nativo de instalação.
   */
  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  /**
   * Se já estiver instalado,
   * não mostra o botão.
   */
  if (isInstalled) {
    return null;
  }

  /**
   * iPhone/iPad:
   * o Safari não disponibiliza o mesmo
   * beforeinstallprompt do Chrome.
   */
  if (isIOS) {
    return (
      <button
        type="button"
        onClick={() => {
          alert(
            "Para instalar o SpaçoVip:\n\n" +
              "1. Toque no botão Compartilhar do Safari.\n" +
              "2. Selecione 'Adicionar à Tela de Início'.\n" +
              "3. Toque em 'Adicionar'.",
          );
        }}
        aria-label="Instalar aplicativo"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        <Smartphone className="h-4 w-4" />

        <span className="hidden sm:inline">Instalar app</span>
      </button>
    );
  }

  /**
   * Chrome/Edge ainda não disponibilizaram
   * o prompt de instalação.
   */
  if (!deferredPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      aria-label="Instalar aplicativo"
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
    >
      <Download className="h-4 w-4" />

      <span className="hidden sm:inline">Instalar app</span>
    </button>
  );
};

export default InstallPwaButton;
