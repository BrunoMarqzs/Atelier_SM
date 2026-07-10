import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ServiceCard } from "@/components/booking/ServiceCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ElegantInput } from "@/components/common/ElegantInput";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useAtelier } from "@/context/AtelierContext";
import { theme } from "@/theme";
import type { PriceType, Service } from "@/types/domain";

export function AdminServicesScreen() {
  const { createService, deactivateService, services, updateService } = useAtelier();
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [saving, setSaving] = useState(false);
  const [serviceError, setServiceError] = useState<string>();
  const highlightedServices = services.filter((service) => service.highlighted).length;
  const quoteServices = services.filter((service) => service.priceType === "quote").length;

  function updateEditingField<Key extends keyof Service>(field: Key, value: Service[Key]) {
    setEditingService((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveService() {
    if (!editingService) {
      return;
    }
    setSaving(true);
    setServiceError(undefined);
    try {
      await updateService(editingService);
      setEditingService(undefined);
    } catch {
      setServiceError("Não foi possível salvar o serviço agora. Confira a conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function startNewService() {
    setSaving(true);
    setServiceError(undefined);
    try {
      const created = await createService({
        name: "Novo serviço",
        description: "Descreva o atendimento oferecido pelo atelier.",
        category: "Atendimento",
        durationMinutes: 60,
        priceType: "quote",
        highlighted: false
      });
      setEditingService(created);
    } catch {
      setServiceError("Não foi possível criar o serviço agora. Confira a conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function removeService(serviceId: number) {
    setSaving(true);
    setServiceError(undefined);
    try {
      await deactivateService(serviceId);
    } catch {
      setServiceError("Não foi possível remover o serviço.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader subtitle="Defina preços, duração e destaque dos atendimentos." title="Serviços" />
      <PremiumSurface style={styles.catalogSummary}>
        <View>
          <Text style={styles.catalogTitle}>Catálogo do atelier</Text>
          <Text style={styles.catalogCopy}>Organize a vitrine que a cliente vê antes de agendar.</Text>
        </View>
        <View style={styles.catalogStats}>
          <Text style={styles.catalogStat}>{services.length} ativos</Text>
          <Text style={styles.catalogStat}>{highlightedServices} destaques</Text>
          <Text style={styles.catalogStat}>{quoteServices} sob avaliação</Text>
        </View>
      </PremiumSurface>
      <PremiumButton
        disabled={saving}
        icon="add-outline"
        label={saving ? "Sincronizando..." : "Novo serviço"}
        onPress={startNewService}
      />
      {serviceError ? <Notice message={serviceError} tone="danger" /> : null}

      {editingService ? (
        <PremiumSurface elevated style={styles.editor}>
          <Text style={styles.editorKicker}>Curadoria do serviço</Text>
          <Text style={styles.editorTitle}>Editar serviço</Text>
          <ElegantInput
            label="Nome"
            onChangeText={(value) => updateEditingField("name", value)}
            value={editingService.name}
          />
          <ElegantInput
            label="Categoria"
            onChangeText={(value) => updateEditingField("category", value)}
            value={editingService.category}
          />
          <ElegantInput
            label="Descrição"
            multiline
            onChangeText={(value) => updateEditingField("description", value)}
            style={styles.descriptionInput}
            textAlignVertical="top"
            value={editingService.description}
          />
          <View style={styles.row}>
            <ElegantInput
              keyboardType="number-pad"
              label="Duração"
              onChangeText={(value) => updateEditingField("durationMinutes", Number(value) || 0)}
              value={String(editingService.durationMinutes)}
            />
            <ElegantInput
              keyboardType="decimal-pad"
              label="Preço"
              onChangeText={(value) =>
                updateEditingField("fixedPrice", value ? Number(value.replace(",", ".")) : undefined)
              }
              placeholder="Sob avaliação"
              value={editingService.fixedPrice ? String(editingService.fixedPrice) : ""}
            />
          </View>
          <View style={styles.segment}>
            {(["fixed", "quote"] as PriceType[]).map((priceType) => {
              const active = editingService.priceType === priceType;
              return (
                <Pressable
                  accessibilityLabel={`Definir preço como ${priceType === "fixed" ? "preço fixo" : "sob avaliação"}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={priceType}
                  onPress={() =>
                    setEditingService((current) =>
                      current
                        ? {
                            ...current,
                            priceType,
                            fixedPrice: priceType === "quote" ? undefined : current.fixedPrice ?? 100
                          }
                        : current
                    )
                  }
                  style={[styles.segmentOption, active ? styles.segmentOptionActive : null]}
                >
                  <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>
                    {priceType === "fixed" ? "Preço fixo" : "Sob avaliação"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityLabel="Mostrar serviço como destaque para clientes"
            accessibilityRole="button"
            accessibilityState={{ checked: editingService.highlighted }}
            onPress={() => updateEditingField("highlighted", !editingService.highlighted)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, editingService.highlighted ? styles.checkboxActive : null]} />
            <Text style={styles.checkboxLabel}>Mostrar como destaque para clientes</Text>
          </Pressable>
          <View style={styles.editorActions}>
            <PremiumButton
              disabled={saving}
              label="Cancelar"
              onPress={() => setEditingService(undefined)}
              variant="secondary"
            />
            <PremiumButton
              disabled={saving}
              icon="save-outline"
              label={saving ? "Salvando..." : "Salvar"}
              onPress={saveService}
            />
          </View>
        </PremiumSurface>
      ) : null}

      <View style={styles.list}>
        {services.length === 0 ? (
          <EmptyState
            icon="cut-outline"
            message="Cadastre o primeiro serviço para que ele apareça na experiência do cliente."
            title="Nenhum serviço ativo"
          />
        ) : null}
        {services.map((service) => (
          <View key={service.id} style={styles.serviceRow}>
            <ServiceCard service={service} />
            <View style={styles.serviceActions}>
              <PremiumButton
                disabled={saving}
                icon="create-outline"
                label="Editar"
                onPress={() => setEditingService(service)}
                variant="secondary"
              />
              <PremiumButton
                disabled={saving}
                icon="trash-outline"
                label="Remover"
                onPress={() => void removeService(service.id)}
                variant="ghost"
              />
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  catalogSummary: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  catalogTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  catalogCopy: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    marginTop: 2
  },
  catalogStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  catalogStat: {
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
    minHeight: 110,
    paddingTop: theme.spacing.md
  },
  row: {
    gap: theme.spacing.md
  },
  segment: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    padding: theme.spacing.xxs
  },
  segmentOption: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 42
  },
  segmentOptionActive: {
    backgroundColor: theme.colors.ivory,
    ...theme.shadows.soft
  },
  segmentLabel: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    fontWeight: "700"
  },
  segmentLabelActive: {
    color: theme.colors.roseGoldDark
  },
  checkboxRow: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 50,
    paddingHorizontal: theme.spacing.md
  },
  checkbox: {
    borderColor: theme.colors.roseGold,
    borderRadius: theme.radius.xs,
    borderWidth: 2,
    height: 20,
    width: 20
  },
  checkboxActive: {
    backgroundColor: theme.colors.roseGold,
    borderColor: theme.colors.roseGoldDark
  },
  checkboxLabel: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  editorActions: {
    gap: theme.spacing.sm
  },
  list: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  serviceRow: {
    gap: theme.spacing.sm
  },
  serviceActions: {
    gap: theme.spacing.xs
  }
});
