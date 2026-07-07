import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PremiumButton } from "@/components/common/PremiumButton";
import { theme } from "@/theme";
import type { Payment } from "@/types/domain";
import { formatMoney } from "@/utils/format";

type PixPaymentPanelProps = {
  onExpired?: () => void;
  payment?: Payment;
};

function millisecondsRemaining(expiresAt?: string) {
  if (!expiresAt) {
    return 0;
  }
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function paymentMessage(payment: Payment, remainingMs: number) {
  if (payment.status === "paid") {
    return "Pagamento confirmado. Este Pix não pode mais ser utilizado.";
  }
  if (payment.status === "expired" || remainingMs <= 0) {
    return "Pagamento expirado. Solicite um novo Pix ao atelier.";
  }
  if (payment.status === "failed") {
    return "Pagamento não confirmado. Solicite orientação ao atelier.";
  }
  if (payment.status === "refunded") {
    return "Pagamento estornado.";
  }
  return "Use o código Pix abaixo dentro do prazo indicado.";
}

async function copyPixCode(code: string) {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(code);
  }
}

export function PixPaymentPanel({ onExpired, payment }: PixPaymentPanelProps) {
  const [remainingMs, setRemainingMs] = useState(() => millisecondsRemaining(payment?.expiresAt));
  const [copied, setCopied] = useState(false);

  const canPay = useMemo(
    () =>
      Boolean(payment?.pixCopyPaste) &&
      payment?.status === "waiting_payment" &&
      remainingMs > 0,
    [payment?.pixCopyPaste, payment?.status, remainingMs]
  );

  useEffect(() => {
    setRemainingMs(millisecondsRemaining(payment?.expiresAt));
    setCopied(false);
  }, [payment?.expiresAt, payment?.id, payment?.status]);

  useEffect(() => {
    if (!payment || payment.status !== "waiting_payment") {
      return undefined;
    }

    const interval = setInterval(() => {
      const nextRemainingMs = millisecondsRemaining(payment.expiresAt);
      setRemainingMs(nextRemainingMs);
      if (nextRemainingMs <= 0) {
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onExpired, payment]);

  if (!payment) {
    return null;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.iconBubble}>
          <Ionicons color={theme.colors.roseGoldDark} name="qr-code-outline" size={22} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Pagamento Pix</Text>
          <Text style={styles.subtitle}>{formatMoney(payment.amount)}</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>
          {payment.status === "waiting_payment" && remainingMs > 0
            ? "Tempo restante"
            : "Status do pagamento"}
        </Text>
        <Text style={styles.statusValue}>
          {payment.status === "waiting_payment" && remainingMs > 0
            ? formatCountdown(remainingMs)
            : payment.status}
        </Text>
      </View>

      <Text style={styles.message}>{paymentMessage(payment, remainingMs)}</Text>

      {payment.pixCopyPaste && canPay ? (
        <View style={styles.pixBox}>
          <Text numberOfLines={3} style={styles.pixCode}>
            {payment.pixCopyPaste}
          </Text>
        </View>
      ) : null}

      <PremiumButton
        disabled={!canPay}
        icon={copied ? "checkmark-circle-outline" : "copy-outline"}
        label={copied ? "Código Pix copiado" : "Copiar código Pix"}
        onPress={() => {
          if (!payment.pixCopyPaste) {
            return;
          }
          void copyPixCode(payment.pixCopyPaste).then(() => setCopied(true));
        }}
        variant={canPay ? "primary" : "secondary"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: theme.colors.porcelain,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  titleBlock: {
    flex: 1
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.roseGoldDark,
    fontWeight: "800"
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  statusLabel: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  statusValue: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  pixBox: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md
  },
  pixCode: {
    ...theme.typography.caption,
    color: theme.colors.graphite
  }
});
