import type { AppointmentRequest } from "@/types/domain";
import { formatMoney, requestScheduledDate } from "@/utils/adminAnalytics";

type ReportFormat = "csv" | "excel" | "pdf";

function escapeCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function requestRows(requests: AppointmentRequest[]) {
  return requests.map((request) => {
    const date = requestScheduledDate(request);
    return {
      Cliente: request.clientName,
      Telefone: request.clientPhone,
      Serviço: request.serviceName,
      Data: date ? date.toLocaleDateString("pt-BR") : "",
      Horário: date ? `${String(date.getHours()).padStart(2, "0")}:00` : "",
      Status: request.status,
      Orçamento: request.estimatedPrice ? formatMoney(request.estimatedPrice) : "Sob avaliação",
      Imagens: request.imageUrls.length,
      Observações: request.notes ?? "",
      Comentário: request.adminComment ?? ""
    };
  });
}

function buildCsv(requests: AppointmentRequest[]) {
  const rows = requestRows(requests);
  const headers = Object.keys(rows[0] ?? {
    Cliente: "",
    Telefone: "",
    Serviço: "",
    Data: "",
    Horário: "",
    Status: "",
    Orçamento: "",
    Imagens: "",
    Observações: "",
    Comentário: ""
  });
  return [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header as keyof typeof row])).join(";"))
  ].join("\n");
}

function buildHtmlTable(requests: AppointmentRequest[]) {
  const rows = requestRows(requests);
  const headers = Object.keys(rows[0] ?? {
    Cliente: "",
    Telefone: "",
    Serviço: "",
    Data: "",
    Horário: "",
    Status: "",
    Orçamento: "",
    Imagens: "",
    Observações: "",
    Comentário: ""
  });
  const cells = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${row[header as keyof typeof row] ?? ""}</td>`).join("")}</tr>`)
    .join("");
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #241d1b; }
          h1 { font-size: 22px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #eadbd4; padding: 8px; text-align: left; }
          th { background: #f4e6df; }
        </style>
      </head>
      <body>
        <h1>Relatório Atelier Sibele Marques</h1>
        <table>
          <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
          <tbody>${cells}</tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadFile(content: string, filename: string, type: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

export function exportRequestsReport(requests: AppointmentRequest[], format: ReportFormat) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    return downloadFile(
      `\ufeff${buildCsv(requests)}`,
      `atelier-pedidos-${stamp}.csv`,
      "text/csv;charset=utf-8"
    );
  }

  if (format === "excel") {
    return downloadFile(
      buildHtmlTable(requests),
      `atelier-pedidos-${stamp}.xls`,
      "application/vnd.ms-excel;charset=utf-8"
    );
  }

  if (typeof window === "undefined") {
    return false;
  }
  const popup = window.open("", "_blank");
  if (!popup) {
    return false;
  }
  popup.document.write(buildHtmlTable(requests));
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}

