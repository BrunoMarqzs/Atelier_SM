import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { ImageUploadTile } from "@/components/booking/ImageUploadTile";
import { ElegantInput } from "@/components/common/ElegantInput";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useAtelier } from "@/context/AtelierContext";
import { useBooking } from "@/context/BookingContext";
import { theme } from "@/theme";
import type { ClientStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<ClientStackParamList, "RequestDetails">;

export function RequestDetailsScreen({ navigation }: Props) {
  const booking = useBooking();
  const atelier = useAtelier();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
      allowsMultipleSelection: true,
      base64: false
    });
    if (!result.canceled) {
      result.assets.slice(0, 8 - booking.imageUris.length).forEach((asset) => {
        booking.addImageUri(asset.uri);
      });
    }
  }

  async function confirm() {
    if (!booking.client || !booking.service || !booking.slot) {
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const request = await atelier.addRequest({
        clientName: booking.client.name,
        clientPhone: booking.client.phone,
        serviceName: booking.service.name,
        serviceId: booking.service.id,
        slotLabel: booking.slot.label,
        slotKey: booking.slot.slotKey,
        slotId: booking.slot.id,
        notes: booking.notes,
        imageUrls: booking.imageUris,
        estimatedPrice: booking.service.fixedPrice
      });
      navigation.navigate("Confirmation", {
        requestId: request.id,
        publicCode: request.publicCode,
        publicUrl: request.publicUrl
      });
    } catch {
      setSubmitError("Não foi possível salvar o pedido agora. Confira a conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle="Inclua referências, detalhes da peça e observações importantes."
        title="Detalhes do pedido"
      />
      <PremiumSurface elevated style={styles.summary}>
        <Text style={styles.summaryTitle}>{booking.service?.name ?? "Serviço selecionado"}</Text>
        <Text style={styles.summaryText}>{booking.slot?.label ?? "Horário selecionado"}</Text>
      </PremiumSurface>
      <ImageUploadTile count={booking.imageUris.length} onPress={pickImage} />
      {booking.imageUris.length > 0 ? (
        <Notice
          message={`${booking.imageUris.length} imagem(ns) anexada(s). O atelier poderá avaliar detalhes, caimento e acabamento com mais precisão.`}
          tone="success"
          title="Referências recebidas"
        />
      ) : (
        <Notice
          message="As fotos são opcionais, mas ajudam a avaliar a peça com mais cuidado antes da confirmação."
          tone="info"
          title="Dica delicada"
        />
      )}
      <ElegantInput
        label="Observações"
        multiline
        numberOfLines={5}
        onChangeText={booking.setNotes}
        placeholder="Conte sobre a peça, tecido, prazo ou ocasião."
        style={styles.notes}
        textAlignVertical="top"
        value={booking.notes}
      />
      {submitError ? <Notice message={submitError} title="Pedido não enviado" tone="danger" /> : null}
      <PremiumButton
        disabled={submitting}
        icon="checkmark-circle-outline"
        label={submitting ? "Enviando solicitação..." : "Confirmar solicitação"}
        onPress={confirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.ink
  },
  summaryTitle: {
    ...theme.typography.section,
    color: theme.colors.white
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.champagne,
    marginTop: theme.spacing.xs
  },
  notes: {
    minHeight: 132,
    paddingTop: theme.spacing.md,
    marginVertical: theme.spacing.md
  }
});
