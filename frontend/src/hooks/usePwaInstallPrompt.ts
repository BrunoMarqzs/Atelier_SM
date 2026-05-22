import { useEffect, useState } from "react";
import { Platform } from "react-native";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function usePwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return undefined;
    }

    const beforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const appInstalled = () => {
      setInstalled(true);
      setInstallPrompt(undefined);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
    window.addEventListener("appinstalled", appInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      return false;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(undefined);
    return choice.outcome === "accepted";
  }

  return {
    canInstall: Boolean(installPrompt),
    install,
    installed
  };
}

