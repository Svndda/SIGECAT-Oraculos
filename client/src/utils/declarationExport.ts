import { formatOracleDate, formatOracleTime, parseOracleToTimeInput } from '../services/common';
import { STATUS_TRANSLATIONS } from '../services/declarationConstants';
import type { Declaration, JobFunction } from '../services/declarationsService';
import type { OfficialFunction } from '../services/officialFunctionService';
import { REST_TYPE_LABELS, type RestTimeResponse } from '../services/restTimeService';
import type { LicenseResponse } from '../services/licenseService';

export function calcTotalDeclaredHours(jobFunctions: JobFunction[]): number {
  let total = 0;
  for (const jf of jobFunctions) {
    if (!jf.starts_at || !jf.ends_at) continue;
    const start = parseOracleToTimeInput(jf.starts_at);
    const end = parseOracleToTimeInput(jf.ends_at);
    if (!start || !end) continue;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let dailyHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    if (dailyHours < 0) dailyHours += 24;
    let multiplier: number;
    const freq = jf.frequency?.toLowerCase() || '';
    if (freq.includes('diario')) multiplier = 5;
    else if (freq.includes('semanal')) multiplier = 1;
    else if (freq.includes('quincenal')) multiplier = 2;
    else if (freq.includes('mensual')) multiplier = 4;
    else if (freq.includes('anual')) multiplier = 0.02;
    else multiplier = 1; // por defecto semanal
    total += dailyHours * multiplier;
  }
  return Math.round(total * 100) / 100;
}

export function calcWeeklyShiftHours(
  startOracle: string | undefined,
  endOracle: string | undefined,
): number {
  if (!startOracle || !endOracle) return 0;
  const startHHMM = parseOracleToTimeInput(startOracle);
  const endHHMM = parseOracleToTimeInput(endOracle);
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  let dailyHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
  if (dailyHours < 0) dailyHours += 24;
  return dailyHours * 5;
}

export function sumDurationsInHours(entries: { starts_at: string; ends_at: string }[]): number {
  let totalMinutes = 0;
  for (const e of entries) {
    const start = new Date(e.starts_at);
    const end = new Date(e.ends_at);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      totalMinutes += (end.getTime() - start.getTime()) / 60000;
    }
  }
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function csvField(value: string | number): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvField).join(',');
}

function functionLabel(jf: JobFunction, officialFnsForJob: OfficialFunction[]): string {
  if (jf.function_type === 'custom') return 'Personalizada';
  if (jf.function_type === 'official') {
    const isOwnJob = officialFnsForJob.some((f) => f.id === jf.official_function_id);
    return isOwnJob ? 'Propia del Cargo' : 'De otro Cargo';
  }
  return 'Oficial';
}

function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
}

/**
 * Builds the CSV content for a declaration. `officialFnsForJob` refines the
 * "official" function label (own job vs. another job's catalogue); pass an
 * empty array for a lighter export where that distinction isn't loaded.
 */
export function buildDeclarationCsv(
  declaration: Declaration,
  restTimes: RestTimeResponse[],
  licenseTimes: LicenseResponse[],
  officialFnsForJob: OfficialFunction[] = [],
): string {
  const {
    job_position,
    job,
    shift_starts_at,
    shift_ends_at,
    justification,
    current_status,
    created_at,
    status_history,
    job_functions = [],
  } = declaration;

  const translatedStatus = current_status ? STATUS_TRANSLATIONS[current_status] : '';

  const totalDeclaredHours = calcTotalDeclaredHours(job_functions)
    + sumDurationsInHours(restTimes) + sumDurationsInHours(licenseTimes);
  const weeklyShiftHours = calcWeeklyShiftHours(shift_starts_at, shift_ends_at);

  const lines: string[] = [];

  lines.push(csvRow(['Puesto', job?.job_code ? `(${job.job_code}) ${job.name ?? ''}` : (job?.name ?? '—')]));
  lines.push(csvRow(['Número de Plaza', job_position?.job_position_number ?? '—']));
  lines.push(csvRow(['Jornada', job_position?.job_shift ?? '—']));
  lines.push(csvRow(['Estado', translatedStatus || '—']));
  lines.push(csvRow(['Fecha de creación', formatOracleDate(created_at, true)]));
  lines.push(csvRow(['Horario del turno',
    `${formatOracleTime(shift_starts_at)} - ${formatOracleTime(shift_ends_at)}`]));
  lines.push(csvRow(['Justificación', justification ?? '—']));
  lines.push(csvRow(['Horas declaradas', totalDeclaredHours]));
  lines.push(csvRow(['Horas de jornada semanal', weeklyShiftHours > 0 ? weeklyShiftHours : '—']));
  lines.push('');

  lines.push(csvRow(['Funciones']));
  lines.push(csvRow(['Función', 'Tipo', 'Descripción', 'Horario', 'Frecuencia', 'Extras', 'Justificación']));
  for (const jf of job_functions) {
    lines.push(csvRow([
      jf.function_name || '—',
      functionLabel(jf, officialFnsForJob),
      jf.function_description || '—',
      `${formatOracleTime(jf.starts_at)} - ${formatOracleTime(jf.ends_at)}`,
      jf.frequency || '—',
      jf.overtime ? 'Sí' : 'No',
      jf.justification || '—',
    ]));
  }
  lines.push('');

  if (restTimes.length > 0) {
    lines.push(csvRow(['Descansos']));
    lines.push(csvRow(['Tipo', 'Inicio', 'Fin', 'Duración (min)']));
    for (const rt of restTimes) {
      lines.push(csvRow([
        REST_TYPE_LABELS[rt.rest_type],
        formatOracleTime(rt.starts_at),
        formatOracleTime(rt.ends_at),
        durationMinutes(rt.starts_at, rt.ends_at),
      ]));
    }
    lines.push('');
  }

  if (licenseTimes.length > 0) {
    lines.push(csvRow(['Licencias']));
    lines.push(csvRow(['Tipo', 'Inicio', 'Fin', 'Duración (min)']));
    for (const lic of licenseTimes) {
      lines.push(csvRow([
        lic.license_type_name || '—',
        formatOracleTime(lic.starts_at),
        formatOracleTime(lic.ends_at),
        durationMinutes(lic.starts_at, lic.ends_at),
      ]));
    }
    lines.push('');
  }

  if (status_history && status_history.length > 0) {
    lines.push(csvRow(['Historial de Estados']));
    lines.push(csvRow(['Estado', 'Fecha']));
    for (const entry of status_history) {
      const histTranslated = STATUS_TRANSLATIONS[entry.status_value] || entry.status_value;
      lines.push(csvRow([histTranslated, formatOracleDate(entry.created_at, true)]));
    }
  }

  return lines.join('\n');
}

export function downloadCsv(content: string, filename: string): void {
  const csvContent = '﻿' + content;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function declarationCsvFilename(declaration: Declaration): string {
  return `declaracion_plaza#${declaration.job_position?.job_position_number || 'export'}.csv`;
}

export function exportDeclarationCsv(
  declaration: Declaration,
  restTimes: RestTimeResponse[],
  licenseTimes: LicenseResponse[],
  officialFnsForJob: OfficialFunction[] = [],
): void {
  const content = buildDeclarationCsv(declaration, restTimes, licenseTimes, officialFnsForJob);
  downloadCsv(content, declarationCsvFilename(declaration));
}

/** Renders a DOM element (e.g. a modal's content) to a paginated A4 PDF. */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const originalStyle = element.style.cssText;
  element.style.overflow = 'visible';
  element.style.maxHeight = 'none';
  element.style.height = 'auto';

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById('declaration-content');
      if (clonedElement) {
        clonedElement.style.overflow = 'visible';
        clonedElement.style.maxHeight = 'none';
      }
    },
  });

  element.style.cssText = originalStyle;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pdfWidth - 2 * margin;
  const usableHeight = pdfHeight - 2 * margin;

  const scale = usableWidth / imgWidth;
  const scaledImgHeight = imgHeight * scale;
  const totalPages = Math.ceil(scaledImgHeight / usableHeight);

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  for (let page = 0; page < totalPages; page++) {
    const srcY = page * (usableHeight / scale);
    const sliceHeight = Math.min(usableHeight / scale, imgHeight - srcY);

    tempCanvas.width = imgWidth;
    tempCanvas.height = sliceHeight;
    tempCtx!.drawImage(canvas, 0, srcY, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);

    const pageImgData = tempCanvas.toDataURL('image/png');
    if (page > 0) pdf.addPage();

    const pageImgWidth = usableWidth;
    const pageImgHeight = sliceHeight * scale;
    pdf.addImage(pageImgData, 'PNG', margin, margin, pageImgWidth, pageImgHeight);
  }

  pdf.save(filename);
}

export function declarationPdfFilename(declaration: Declaration): string {
  return `declaracion_plaza#${declaration.job_position?.job_position_number || 'export'}.pdf`;
}
