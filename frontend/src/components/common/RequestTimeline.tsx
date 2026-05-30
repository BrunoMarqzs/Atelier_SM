import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";
import type { AppointmentStatus, RequestTimelineEvent } from "@/types/domain";

type RequestTimelineProps = {
  events?: RequestTimelineEvent[];
  limit?: number;
  title?: string;
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pedido recebido",
  under_review: "Pedido em avaliação",
  quote_sent: "Orçamento enviado",
  approved: "Pedido aprovado",
  rejected: "Pedido recusado",
  in_progress: "Pedido em andamento",
  completed: "Pedido concluído",
  cancelled: "Pedido cancelado"
};

function formatTimelineDate(value: string) {
  const eventDate = new Date(value);
  if (Number.isNaN(eventDate.getTime())) {
    return "Data não informada";
  }

  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const time = eventDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (eventDate >= startOfToday) {
    return `Hoje - ${time}`;
  }
  if (eventDate >= startOfYesterday && eventDate < startOfToday) {
    return `Ontem - ${time}`;
  }

  return `${eventDate.toLocaleDateString("pt-BR")} - ${time}`;
}

function eventTitle(event: RequestTimelineEvent) {
  if (event.comment?.toLowerCase().includes("orçamento atualizado")) {
    return "Orçamento atualizado";
  }
  if (event.comment?.toLowerCase().includes("remarc")) {
    return "Horário remarcado";
  }
  if (event.changedBy === "client") {
    return "Atualização da cliente";
  }
  return statusLabels[event.toStatus] ?? "Atualização do pedido";
}

function eventDescription(event: RequestTimelineEvent) {
  if (event.comment) {
    return event.comment;
  }
  return statusLabels[event.toStatus] ?? "Pedido atualizado.";
}

export function RequestTimeline({ events, limit, title = "Histórico" }: RequestTimelineProps) {
  const visibleEvents = [...(events ?? [])]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);

  if (!visibleEvents.length) {
    return null;
  }

  return (
    <View style={styles.timeline}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.items}>
        {visibleEvents.map((event) => (
          <View key={event.id} style={styles.item}>
            <View style={styles.rail}>
              <View style={styles.dot} />
              <View style={styles.line} />
            </View>
            <View style={styles.body}>
              <Text style={styles.date}>{formatTimelineDate(event.createdAt)}</Text>
              <Text style={styles.eventTitle}>{eventTitle(event)}</Text>
              <Text style={styles.description}>{eventDescription(event)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 2,
    paddingBottom: theme.spacing.sm
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800"
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  dot: {
    backgroundColor: theme.colors.ivory,
    borderColor: theme.colors.roseGold,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 12,
    marginTop: 2,
    width: 12
  },
  eventTitle: {
    ...theme.typography.body,
    color: theme.colors.ink,
    fontWeight: "800"
  },
  item: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  items: {
    gap: theme.spacing.xs
  },
  line: {
    backgroundColor: theme.colors.lineStrong,
    flex: 1,
    marginTop: 4,
    width: 1
  },
  rail: {
    alignItems: "center",
    minHeight: 52,
    width: 14
  },
  timeline: {
    backgroundColor: theme.colors.porcelain,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  }
});
