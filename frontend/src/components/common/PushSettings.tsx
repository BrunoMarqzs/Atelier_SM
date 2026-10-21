import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";

import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { adminPushApi } from "@/services/api";

function supportMessage() {
  if (Platform.OS !== "web" || typeof window === "undefined") return "Use o site para ativar os avisos.";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (ios && !window.matchMedia("(display-mode: standalone)").matches) {
    return "No iPhone (iOS 16.4 ou mais recente), abra no Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra pelo novo ícone e entre no painel.";
  }
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "Este navegador não oferece notificações. Atualize o iOS/navegador e use o site com HTTPS.";
  }
  return "";
}

async function registration() {
  await navigator.serviceWorker.register("/sw.js");
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("O serviço do navegador não iniciou. Reabra o site e tente novamente.")), 15000))
  ]);
}

function publicKeyBytes(value: string) {
  const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function pushError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "NotAllowedError") return "Permissão bloqueada. Abra Ajustes → Notificações → Atelier e permita os avisos.";
    if (error.name === "InvalidStateError") return "A inscrição deste navegador precisa ser renovada. Desative os avisos nos ajustes do aparelho e ative novamente no site. Se persistir, peça a revisão da configuração do servidor.";
    if (error.name === "AbortError" || error.name === "TimeoutError" || error.name === "NetworkError" || error instanceof TypeError) {
      return "Não foi possível confirmar a alteração. Verifique a conexão e toque em Verificar configuração antes de tentar novamente.";
    }
    return error.message;
  }
  return "Não foi possível configurar os avisos. Verifique a conexão e tente novamente.";
}

export function PushSettings() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<{ enabled: boolean; publicKey: string }>();
  const unsupported = supportMessage();

  async function refresh() {
    setBusy(true);
    try {
      const currentConfig = await adminPushApi<{ enabled: boolean; publicKey: string }>("config");
      setConfig(currentConfig);
      if (unsupported) return;
      const sub = await (await registration()).pushManager.getSubscription();
      const current = sub ? await adminPushApi<{ enabled: boolean }>("status", { endpoint: sub.endpoint }) : { enabled: false };
      setEnabled(current.enabled);
      setMessage(Notification.permission === "denied"
        ? "Permissão bloqueada. No iPhone, abra Ajustes → Notificações → Atelier e permita os avisos. Depois volte e toque em Verificar."
        : currentConfig.enabled ? "" : "Avisos desligados ou ainda não configurados no servidor.");
    } catch (error) {
      setMessage(pushError(error));
    } finally { setBusy(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      // Must be invoked before any network await: iOS requires a direct user gesture.
      if (!enabled && await Notification.requestPermission() !== "granted") {
        throw new Error("Permissão não concedida. Abra Ajustes → Notificações → Atelier para permitir os avisos.");
      }
      const reg = await registration();
      let sub = await reg.pushManager.getSubscription();
      if (enabled) {
        // Stop server delivery first. Do not report success if the API could not persist it.
        if (sub) await adminPushApi("unsubscribe", { endpoint: sub.endpoint });
        if (sub) await sub.unsubscribe();
        setEnabled(false);
        setMessage("Avisos desativados neste aparelho. Um aviso já enviado ainda pode aparecer.");
      } else {
        if (!config?.enabled) throw new Error("Avisos ainda não configurados no servidor.");
        sub = sub ?? await reg.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: publicKeyBytes(config.publicKey)
        });
        const keys = sub.toJSON().keys;
        await adminPushApi("subscribe", { endpoint: sub.endpoint, p256dh: keys?.p256dh, auth: keys?.auth });
        setEnabled(true);
        setMessage("Ativadas neste aparelho para novos pedidos. O modo Foco, a conexão e o servidor podem atrasar os avisos.");
      }
    } catch (error) {
      setMessage(pushError(error));
    } finally { setBusy(false); }
  }

  return (
    <View style={{ gap: 12, marginVertical: 16 }}>
      <Text>Notificações neste aparelho: {enabled ? "ativadas" : "desativadas / não confirmadas"}</Text>
      <Notice title="Avisos de novos pedidos" tone="info" message={unsupported || "O aviso não mostra dados da cliente. Ao tocar, entre no painel para consultar os pedidos. Ative apenas em aparelhos pessoais."} />
      {message ? <Notice title="Configuração dos avisos" tone="info" message={message} /> : null}
      {!unsupported ? <PremiumButton
        label={busy ? "Aguarde..." : enabled ? "Desativar neste aparelho" : "Ativar neste aparelho"}
        disabled={busy || (!enabled && !config?.enabled)}
        onPress={() => void toggle()}
      /> : null}
      <PremiumButton label="Verificar configuração" variant="secondary" disabled={busy} onPress={() => void refresh()} />
    </View>
  );
}
