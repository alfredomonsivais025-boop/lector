import { ScanRecord } from './types';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateCSV(records: ScanRecord[]): string {
  const header = 'Nombre,Codigo de Producto,Fecha,Hora';
  const rows = records.map((r) => {
    const dt = new Date(r.scanned_at);
    const fecha = dt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const hora = dt.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return [
      escapeCSV(r.employee_name),
      escapeCSV(r.product_code),
      fecha,
      hora,
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export function getCSVFilename(year: number, week: number): string {
  return `registros_semana_${week}_${year}.csv`;
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
