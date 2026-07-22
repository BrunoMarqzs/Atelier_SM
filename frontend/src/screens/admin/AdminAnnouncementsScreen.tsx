import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/common/EmptyState";
import { ElegantInput } from "@/components/common/ElegantInput";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useAtelier } from "@/context/AtelierContext";
import { theme } from "@/theme";
import type { Announcement, AnnouncementAction, AnnouncementKind } from "@/types/domain";

const KIND_OPTIONS: Array<{ label: string; value: AnnouncementKind }> = [
  { label: "Promoção", value: "promotion" },
  { label: "Aviso", value: "notice" },
  { label: "Novidade", value: "news" },
  { label: "Agenda", value: "schedule" }
];

const ACTION_OPTIONS: Array<{ label: string; value: AnnouncementAction }> = [
  { label: "Sem botão", value: "none" },
  { label: "Agendar", value: "create_order" },
  { label: "Consultar pedido", value: "client_history" },
  { label: "Link externo", value: "external_url" }
];

function kindLabel(kind: AnnouncementKind) {
  return KIND_OPTIONS.find((item) => item.value === kind)?.label ?? "Novidade";
}

function blankAnnouncement(): Omit<Announcement, "id" | "createdAt" | "updatedAt"> {
  return {
    title: "Nova chamada do atelier",
    body: "Descreva a promoção, aviso ou novidade que deve aparecer para as clientes.",
    kind: "news",
    ctaLabel: "Agendar atendimento",
    ctaAction: "create_order",
    ctaUrl: undefined,
    startsAt: undefined,
    endsAt: undefined,
    priority: 10,
    isActive: true
  };
}

export function AdminAnnouncementsScreen() {
  const {
    announcements,
    createAnnouncement,
    deactivateAnnouncement,
    updateAnnouncement
  } = useAtelier();
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | Omit<Announcement, "id" | "createdAt" | "updatedAt">>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function updateField<Key extends keyof Omit<Announcement, "id" | "createdAt" | "updatedAt">>(
    field: Key,
    value: Omit<Announcement, "id" | "createdAt" | "updatedAt">[Key]
  ) {
    setEditingAnnouncement((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveAnnouncement() {
    if (!editingAnnouncement) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if ("id" in editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement);
      } else {
        await createAnnouncement(editingAnnouncement);
      }
      setEditingAnnouncement(undefined);
      setNotice("A vitrine da tela inicial foi atualizada.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível salvar o anúncio.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAnnouncement(announcementId: number) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await deactivateAnnouncement(announcementId);
      setNotice("Anúncio desativado.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível desativar o anúncio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        subtitle="Controle promoções, avisos e chamadas exibidas na tela inicial."
        title="Vitrine"
      />
      <PremiumSurface style={styles.summary}>
        <Text style={styles.summaryTitle}>Comunicação da home</Text>
        <Text style={styles.summaryCopy}>
          Use anúncios curtos para destacar agenda aberta, promoções, datas especiais ou avisos importantes.
        </Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>{announcements.length} cadastrados</Text>
          <Text style={styles.stat}>{announcements.filter((item) => item.isActive).length} ativos</Text>
        </View>
      </PremiumSurface>

      <PremiumButton
        disabled={saving}
        icon="megaphone-outline"
        label="Novo anúncio"
        onPress={() => setEditingAnnouncement(blankAnnouncement())}
      />
      {notice ? <Notice message={notice} tone="success" /> : null}
      {error ? <Notice message={error} tone="danger" /> : null}

      {editingAnnouncement ? (
        <PremiumSurface elevated style={styles.editor}>
          <Text style={styles.editorKicker}>Vitrine da cliente</Text>
          <Text style={styles.editorTitle}>
            {"id" in editingAnnouncement ? "Editar anúncio" : "Novo anúncio"}
          </Text>
          <ElegantInput
            label="Título"
            onChangeText={(value) => updateField("title", value)}
            value={editingAnnouncement.title}
          />
          <ElegantInput
            label="Descrição"
            multiline
            onChangeText={(value) => updateField("body", value)}
            style={styles.descriptionInput}
            textAlignVertical="top"
            value={editingAnnouncement.body}
          />
          <View style={styles.segmentWrap}>
            {KIND_OPTIONS.map((item) => {
              const active = editingAnnouncement.kind === item.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={item.value}
                  onPress={() => updateField("kind", item.value)}
                  style={[styles.segmentPill, active ? styles.segmentPillActive : null]}
                >
                  <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.segmentWrap}>
            {ACTION_OPTIONS.map((item) => {
              const active = editingAnnouncement.ctaAction === item.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={item.value}
                  onPress={() => {
                    updateField("ctaAction", item.value);
                    if (item.value === "none") {
                      updateField("ctaLabel", undefined);
                      updateField("ctaUrl", undefined);
                    }
                  }}
                  style={[styles.segmentPill, active ? styles.segmentPillActive : null]}
                >
                  <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {editingAnnouncement.ctaAction !== "none" ? (
            <ElegantInput
              label="Texto do botão"
              onChangeText={(value) => updateField("ctaLabel", value)}
              value={editingAnnouncement.ctaLabel ?? ""}
            />
          ) : null}
          {editingAnnouncement.ctaAction === "external_url" ? (
            <ElegantInput
              label="Link externo"
              onChangeText={(value) => updateField("ctaUrl", value)}
              placeholder="https://..."
              value={editingAnnouncement.ctaUrl ?? ""}
            />
          ) : null}
          <View style={styles.row}>
            <ElegantInput
              keyboardType="number-pad"
              label="Prioridade"
              onChangeText={(value) => updateField("priority", Number(value) || 0)}
              value={String(editingAnnouncement.priority)}
            />
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: editingAnnouncement.isActive }}
              onPress={() => updateField("isActive", !editingAnnouncement.isActive)}
              style={styles.activeSwitch}
            >
              <View style={[styles.switchDot, editingAnnouncement.isActive ? styles.switchDotActive : null]} />
              <Text style={styles.switchText}>{editingAnnouncement.isActive ? "Ativo" : "Inativo"}</Text>
            </Pressable>
          </View>
          <View style={styles.editorActions}>
            <PremiumButton
              disabled={saving}
              label="Cancelar"
              onPress={() => setEditingAnnouncement(undefined)}
              variant="secondary"
            />
            <PremiumButton
              disabled={saving}
              icon="save-outline"
              label={saving ? "Salvando..." : "Salvar anúncio"}
              onPress={saveAnnouncement}
            />
          </View>
        </PremiumSurface>
      ) : null}

      <View style={styles.list}>
        {announcements.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            message="Crie a primeira chamada para substituir os serviços em destaque na home."
            title="Nenhum anúncio"
          />
        ) : null}
        {announcements.map((announcement) => (
          <PremiumSurface key={announcement.id} style={styles.announcementCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardContent}>
                <Text style={styles.kicker}>{kindLabel(announcement.kind)}</Text>
                <Text style={styles.cardTitle}>{announcement.title}</Text>
                <Text style={styles.cardBody}>{announcement.body}</Text>
              </View>
              <Text style={[styles.statusBadge, announcement.isActive ? styles.statusBadgeActive : null]}>
                {announcement.isActive ? "Ativo" : "Inativo"}
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.meta}>Prioridade {announcement.priority}</Text>
              {announcement.ctaLabel ? <Text style={styles.meta}>Botão: {announcement.ctaLabel}</Text> : null}
            </View>
            <View style={styles.actions}>
              <PremiumButton
                disabled={saving}
                icon="create-outline"
                label="Editar"
                onPress={() => setEditingAnnouncement(announcement)}
                variant="secondary"
              />
              <PremiumButton
                disabled={saving || !announcement.isActive}
                icon="eye-off-outline"
                label="Desativar"
                onPress={() => void removeAnnouncement(announcement.id)}
                variant="ghost"
              />
            </View>
          </PremiumSurface>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  summaryTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  summaryCopy: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    marginTop: 2
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  stat: {
    ...theme.typography.caption,
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs
  },
  editor: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  editorKicker: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  editorTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: theme.spacing.md
  },
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  segmentPill: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs
  },
  segmentPillActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  segmentText: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: theme.colors.white
  },
  row: {
    gap: theme.spacing.md
  },
  activeSwitch: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 54,
    paddingHorizontal: theme.spacing.md
  },
  switchDot: {
    backgroundColor: theme.colors.taupe,
    borderRadius: theme.radius.pill,
    height: 14,
    width: 14
  },
  switchDotActive: {
    backgroundColor: theme.colors.sage
  },
  switchText: {
    ...theme.typography.body,
    color: theme.colors.graphite,
    fontWeight: "800"
  },
  editorActions: {
    gap: theme.spacing.sm
  },
  list: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  announcementCard: {
    gap: theme.spacing.md
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between"
  },
  cardContent: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  cardTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  cardBody: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  statusBadge: {
    ...theme.typography.caption,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    color: theme.colors.taupe,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs
  },
  statusBadgeActive: {
    borderColor: theme.colors.sage,
    color: theme.colors.sage
  },
  cardFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.taupe
  },
  actions: {
    gap: theme.spacing.xs
  }
});
