import { useState } from "react";
import { Linking } from "react-native";

import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import type { AppointmentRequest } from "@/types/domain";
import { buildWhatsAppUrl } from "@/utils/whatsapp";

type WhatsAppNotifyButtonProps = {
  request: AppointmentRequest;
};

export function WhatsAppNotifyButton({ request }: WhatsAppNotifyButtonProps) {
  const [error, setError] = useState("");

  async function openWhatsApp() {
    setError("");
    const url = buildWhatsAppUrl(request);
    if (!url) {
      setError("Telefone da cliente inválido para abrir o WhatsApp.");
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      setError("Não foi possível abrir o WhatsApp neste dispositivo.");
    }
  }

  return (
    <>
      {error ? <Notice message={error} title="WhatsApp indisponível" tone="warning" /> : null}
      <PremiumButton
        icon="logo-whatsapp"
        label="Avisar cliente no WhatsApp"
        onPress={() => void openWhatsApp()}
        variant="secondary"
      />
    </>
  );
}
