import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
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
import { uploadRequestImages, type ImageUploadResult } from "@/services/atelierRepository";
import type { AppointmentRequest } from "@/types/domain";
import { theme } from "@/theme";
import type { ClientStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<ClientStackParamList, "RequestDetails">;

export function RequestDetailsScreen({ navigation }: Props) {
  const booking = useBooking();
  const atelier = useAtelier();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [confirmed, setConfirmed] = useState<AppointmentRequest>();
  const [uploads, setUploads] = useState<ImageUploadResult[]>([]);
  const [progress, setProgress] = useState("");
  const busy = useRef(false);
  const confirmedRef = useRef<AppointmentRequest | undefined>(undefined);

  async function pickImage() {
    if (busy.current || confirmedRef.current) return;
    if (booking.imageUris.length >= 8) {
      setSubmitError("Você pode selecionar até 8 fotos por pedido.");
      return;
    }
    try {
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
    } catch {
      setSubmitError("Não foi possível selecionar as fotos. Tente novamente.");
    }
  }

  function showConfirmation(request: AppointmentRequest) {
    navigation.replace("Confirmation", {
      requestId: request.id, publicCode: request.publicCode, publicUrl: request.publicUrl
    });
  }

  async function sendImages(request: AppointmentRequest, uris: string[]) {
    setProgress(`Preparando e enviando fotos: 0 de ${uris.length}`);
    const results = await uploadRequestImages(request.id, uris,
      (done, total) => setProgress(`Fotos processadas: ${done} de ${total}`));
    setUploads(current => [...current.filter(item => !uris.includes(item.uri)), ...results]);
    setProgress("");
    if (results.every(item => item.url)) showConfirmation(request);
  }

  async function retryImages() {
    if (busy.current || !confirmedRef.current) return;
    busy.current = true;
    setSubmitting(true);
    try {
      await sendImages(confirmedRef.current, uploads.filter(item => !item.url).map(item => item.uri));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  async function confirm() {
    if (busy.current || confirmedRef.current || !booking.client || !booking.service || !booking.slot) {
      return;
    }
    busy.current = true;
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
      confirmedRef.current = request;
      setConfirmed(request);
      await sendImages(request, [...booking.imageUris]);
    } catch {
      setSubmitError(confirmedRef.current
        ? "O pedido foi registrado, mas houve uma falha ao processar os anexos. Não crie outro pedido."
        : "Não foi possível confirmar o registro. Confira seu histórico antes de tentar novamente.");
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => {
          if (busy.current) return;
          if (confirmedRef.current) showConfirmation(confirmedRef.current);
          else navigation.goBack();
        }}
        subtitle="Inclua referências, detalhes da peça e observações importantes."
        title="Detalhes do pedido"
      />
      <PremiumSurface elevated style={styles.summary}>
        <Text style={styles.summaryTitle}>{booking.service?.name ?? "Serviço selecionado"}</Text>
        <Text style={styles.summaryText}>{booking.slot?.label ?? "Horário selecionado"}</Text>
      </PremiumSurface>
      <ImageUploadTile count={booking.imageUris.length} onPress={submitting || confirmed ? undefined : pickImage} />
      {booking.imageUris.length > 0 ? (
        <Notice
          message={`${booking.imageUris.length} foto(s) selecionada(s). As fotos serão enviadas depois do registro do pedido. Até 8 fotos; no navegador, serão otimizadas para envio.`}
          tone="info"
          title="Referências selecionadas"
        />
      ) : (
        <Notice
          message="As fotos são opcionais, mas ajudam a avaliar a peça com mais cuidado antes da confirmação."
          tone="info"
          title="Dica delicada"
        />
      )}
      <ElegantInput
        editable={!submitting && !confirmed}
        label="Observações"
        multiline
        numberOfLines={5}
        onChangeText={booking.setNotes}
        placeholder="Conte sobre a peça, tecido, prazo ou ocasião."
        style={styles.notes}
        textAlignVertical="top"
        value={booking.notes}
      />
      {confirmed ? <Notice tone="success" title="Pedido registrado"
        message={`Pedido ${confirmed.publicCode ?? `#${confirmed.id}`} salvo. Uma falha nas fotos não cancela o pedido. ${progress}`} /> : null}
      {uploads.some(item => !item.url) ? <Notice tone="info" title="Algumas fotos não foram enviadas"
        message={`${uploads.filter(item => !!item.url).length} enviada(s); ${uploads.filter(item => !item.url).length} pendente(s). Mantenha esta página aberta para reenviar as pendentes.\n${uploads.filter(item => !item.url).map(item => item.error).join("\n")}`} /> : null}
      {submitError ? <Notice message={submitError} title={confirmed ? "Atenção aos anexos" : "Não foi possível confirmar"} tone="danger" /> : null}
      {!confirmed ? <PremiumButton
        disabled={submitting}
        icon="checkmark-circle-outline"
        label={submitting ? "Enviando solicitação..." : "Confirmar solicitação"}
        onPress={confirm}
      /> : null}
      {confirmed && uploads.some(item => !item.url) ? <PremiumButton
        disabled={submitting} label={submitting ? progress : "Reenviar somente fotos pendentes"}
        onPress={retryImages} /> : null}
      {confirmed ? <PremiumButton disabled={submitting} variant="secondary"
        label="Continuar com o pedido registrado" onPress={() => showConfirmation(confirmed)} /> : null}
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
