import jsPDFModule from 'jspdf';
import * as XLSX from 'xlsx';

const jsPDF = jsPDFModule.jsPDF || jsPDFModule;

// ==============================================================================
// Brazilian Formatting Utilities (pt-BR)
// ==============================================================================
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatLiters(value) {
  if (value === null || value === undefined || isNaN(value)) return '0,00 L';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

export function formatKm(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function formatConsumption(value) {
  if (value === null || value === undefined || isNaN(value)) return 'Sem dados';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L`;
}

export function formatDateBR(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR');
  if (dateStr.includes('T')) {
    const [d] = dateStr.split('T');
    return d.split('-').reverse().join('/');
  }
  if (dateStr.includes('-')) {
    return dateStr.split('-').reverse().join('/');
  }
  return dateStr;
}

// Compute fuel summary grouped strictly by actual fuel used (never 'Flex')
function computeFuelSummary(records, providedSummary) {
  if (providedSummary?.fuels && providedSummary.fuels.length > 0) {
    return providedSummary.fuels.map(f => ({
      ...f,
      name: f.name?.toUpperCase() === 'FLEX' ? 'Gasolina' : f.name
    }));
  }
  const map = {};
  for (const r of records) {
    let fuel = r.fuel_type || 'Diesel S10';
    if (fuel.toUpperCase() === 'FLEX') fuel = 'Gasolina';
    if (!map[fuel]) {
      map[fuel] = { name: fuel, count: 0, liters: 0, total_cost: 0 };
    }
    map[fuel].count += 1;
    map[fuel].liters += Number(r.liters || 0);
    map[fuel].total_cost += Number(r.total_cost || 0);
  }
  return Object.values(map);
}

// ==============================================================================
// Master PDF Generator Engine (Executive Corporate Report Diagramming)
// ==============================================================================
export function createFleetPDFDoc({
  reportType = 'semanal', // 'semanal' | 'consolidado' | 'individual'
  title = 'RELATÓRIO SEMANAL DE ABASTECIMENTO',
  sessionCode = null,
  periodStr = null,
  dateStr = null,
  records = [],
  summary = {}
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  // Executive Clean Palette
  const darkNavy = [15, 23, 42];        // #0f172a
  const slateBorder = [226, 232, 240];  // #e2e8f0
  const bgCard = [248, 250, 252];       // #f8fafc
  const textMuted = [100, 116, 139];    // #64748b
  const textDark = [15, 23, 42];        // #0f172a
  const emeraldBrand = [5, 150, 105];   // #059669
  const blueBrand = [2, 132, 199];      // #0284c7
  const amberWarning = [217, 119, 6];   // #d97706

  const now = new Date();
  const generationDateStr = now.toLocaleDateString('pt-BR');
  const generationTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const generationFullStr = `${generationDateStr} às ${generationTimeStr}`;

  const formattedPeriod = periodStr || (dateStr ? formatDateBR(dateStr) : generationDateStr);
  let yPos = 12;

  // Helper for adding new page with mini header
  function checkPageBreak(neededHeight) {
    if (yPos + neededHeight > pageHeight - 16) {
      doc.addPage();
      yPos = 12;
      drawPageHeaderMini();
    }
  }

  function drawPageHeaderMini() {
    doc.setFillColor(...darkNavy);
    doc.roundedRect(margin, yPos, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`GERENCIAMENTO DE FROTA • ${title.toUpperCase()}`, margin + 4, yPos + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Período: ${formattedPeriod}`, pageWidth - margin - 4, yPos + 5.5, { align: 'right' });
    yPos += 13;
  }

  // ==============================================================================
  // 1. TOP HEADER (Page 1 - Corporate Clean Box)
  // ==============================================================================
  doc.setFillColor(...darkNavy);
  doc.roundedRect(margin, yPos, contentWidth, 24, 2.5, 2.5, 'F');

  // Left Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('GERENCIAMENTO DE FROTA', margin + 6, yPos + 8.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(title, margin + 6, yPos + 17);

  // Right Header Info (Separated & Organized)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Período: ${formattedPeriod}`, pageWidth - margin - 6, yPos + 8.5, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const extraInfo = sessionCode ? `Sessão: ${sessionCode} • ` : '';
  doc.text(`${extraInfo}Gerado em: ${generationFullStr}`, pageWidth - margin - 6, yPos + 17, { align: 'right' });

  yPos += 28;

  // ==============================================================================
  // 2. RESUMO EXECUTIVO: 4 CARDS (Requirement 11)
  // ==============================================================================
  const totalVehiclesCount = summary?.total_vehicles || new Set(records.map(r => r.vehicle_id || r.vehicle_plate)).size || records.length;
  const totalFuelingsCount = records.length || totalVehiclesCount;
  const totalLitersVal = Number(summary?.total_liters || records.reduce((s, r) => s + Number(r.liters || 0), 0));
  const totalCostVal = Number(summary?.total_cost || records.reduce((s, r) => s + Number(r.total_cost || 0), 0));

  const cardSpacing = 3;
  const colWidth = (contentWidth - (cardSpacing * 3)) / 4;

  // Card 1: VEÍCULOS ABASTECIDOS
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...slateBorder);
  doc.roundedRect(margin, yPos, colWidth, 18, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('VEÍCULOS ABASTECIDOS', margin + 3.5, yPos + 5.5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(`${totalVehiclesCount}`, margin + 3.5, yPos + 13.5);

  // Card 2: TOTAL DE ABASTECIMENTOS
  const xCard2 = margin + colWidth + cardSpacing;
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...slateBorder);
  doc.roundedRect(xCard2, yPos, colWidth, 18, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('TOTAL ABASTECIMENTOS', xCard2 + 3.5, yPos + 5.5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(`${totalFuelingsCount}`, xCard2 + 3.5, yPos + 13.5);

  // Card 3: TOTAL DE LITROS
  const xCard3 = margin + ((colWidth + cardSpacing) * 2);
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...slateBorder);
  doc.roundedRect(xCard3, yPos, colWidth, 18, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('TOTAL DE LITROS', xCard3 + 3.5, yPos + 5.5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blueBrand);
  doc.text(formatLiters(totalLitersVal), xCard3 + 3.5, yPos + 13.5);

  // Card 4: VALOR TOTAL (Destaque Emerald)
  const xCard4 = margin + ((colWidth + cardSpacing) * 3);
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(167, 243, 208); // Emerald 200
  doc.roundedRect(xCard4, yPos, colWidth, 18, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text('VALOR TOTAL', xCard4 + 3.5, yPos + 5.5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldBrand);
  doc.text(formatCurrency(totalCostVal), xCard4 + 3.5, yPos + 13.5);

  yPos += 22;

  // ==============================================================================
  // 3. RESUMO POR COMBUSTÍVEL (Requirement 12)
  // ==============================================================================
  const fuels = computeFuelSummary(records, summary);
  if (fuels.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkNavy);
    doc.text('RESUMO POR COMBUSTÍVEL', margin, yPos);
    yPos += 3.5;

    const fuelCardCount = Math.min(fuels.length, 3);
    const fuelCardWidth = (contentWidth - ((fuelCardCount - 1) * 4)) / fuelCardCount;

    fuels.forEach((fuel, idx) => {
      const isDiesel = fuel.name.toUpperCase().includes('DIESEL');
      const isGasolina = fuel.name.toUpperCase().includes('GASOLINA');
      const xFuel = margin + (idx * (fuelCardWidth + 4));

      doc.setFillColor(...bgCard);
      doc.setDrawColor(...slateBorder);
      doc.roundedRect(xFuel, yPos, fuelCardWidth, 19, 2, 2, 'FD');

      // Fuel Name Header
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isDiesel ? 22 : (isGasolina ? 2 : 180), isDiesel ? 101 : (isGasolina ? 132 : 83), isDiesel ? 52 : (isGasolina ? 199 : 9));
      doc.text(fuel.name.toUpperCase(), xFuel + 4, yPos + 5.5);

      // Vehicles & Liters
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(`${fuel.count} ${fuel.count === 1 ? 'veículo' : 'veículos'}  •  ${formatLiters(fuel.liters)}`, xFuel + 4, yPos + 11);

      // Subtotal Cost
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(`${formatCurrency(fuel.total_cost)} gastos`, xFuel + 4, yPos + 16);
    });

    yPos += 24;
  }

  // ==============================================================================
  // 4. DETALHAMENTO POR VEÍCULO (3 COLUNAS - Requirements 14, 15, 16, 17, 18, 19)
  // ==============================================================================
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(`DETALHAMENTO POR VEÍCULO (${records.length} ABASTECIMENTOS)`, margin, yPos);
  yPos += 4;

  records.forEach((r, idx) => {
    const isOdometerWorking = r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1';
    const hasPreviousKm = r.km_previous !== null && r.km_previous !== undefined && r.km_previous !== '' && Number(r.km_previous) > 0;
    
    // Dynamic height calculation
    const isSpecialCase = !isOdometerWorking || !hasPreviousKm;
    const cardHeight = isSpecialCase ? 29 : 32;

    checkPageBreak(cardHeight + 3);

    // Vehicle Card Container
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...slateBorder);
    doc.roundedRect(margin, yPos, contentWidth, cardHeight, 2, 2, 'FD');

    // Card Header Bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos, contentWidth, 7.5, 2, 2, 'F');
    doc.rect(margin, yPos + 4.5, contentWidth, 3, 'F'); // flatten bottom

    // Vehicle Number and Name
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkNavy);
    const vehicleNum = String(idx + 1).padStart(2, '0');
    doc.text(`${vehicleNum} — ${(r.vehicle_name || 'VEÍCULO').toUpperCase()}`, margin + 4, yPos + 5.2);

    // Plate
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textMuted);
    doc.text(`Placa: ${r.vehicle_plate || '-'}`, margin + 68, yPos + 5.2);

    // Fuel Type
    doc.setFont('helvetica', 'normal');
    doc.text(`Combustível: ${r.fuel_type || 'Diesel'}`, margin + 110, yPos + 5.2);

    // Cost on Right
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...emeraldBrand);
    doc.text(formatCurrency(r.total_cost), pageWidth - margin - 4, yPos + 5.2, { align: 'right' });

    // Card Content Columns
    const yBody = yPos + 11.5;

    // --- Coluna 1: QUILOMETRAGEM ---
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textMuted);
    doc.text('QUILOMETRAGEM', margin + 4, yBody);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    if (!isOdometerWorking) {
      doc.text('Anterior: —', margin + 4, yBody + 5);
      doc.text('Atual: —', margin + 4, yBody + 9.5);
      doc.text('Rodados: —', margin + 4, yBody + 14);
    } else if (!hasPreviousKm) {
      doc.text('Anterior: — (Primeiro)', margin + 4, yBody + 5);
      doc.text(`Atual: ${formatKm(r.km_current)}`, margin + 4, yBody + 9.5);
      doc.text('Rodados: —', margin + 4, yBody + 14);
    } else {
      doc.text(`Anterior: ${formatKm(r.km_previous)}`, margin + 4, yBody + 5);
      doc.text(`Atual: ${formatKm(r.km_current)}`, margin + 4, yBody + 9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...blueBrand);
      doc.text(`Rodados: ${formatKm(r.km_driven)}`, margin + 4, yBody + 14);
    }

    // --- Coluna 2: ABASTECIMENTO ---
    const xCol2 = margin + 65;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textMuted);
    doc.text('ABASTECIMENTO', xCol2, yBody);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(`Litros: ${formatLiters(r.liters)}`, xCol2, yBody + 5);
    doc.text(`Preço/L: ${formatCurrency(r.price_per_liter)}`, xCol2, yBody + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...emeraldBrand);
    doc.text(`Total: ${formatCurrency(r.total_cost)}`, xCol2, yBody + 14);

    // --- Coluna 3: DESEMPENHO ---
    const xCol3 = margin + 120;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textMuted);
    doc.text('DESEMPENHO', xCol3, yBody);

    if (!isOdometerWorking) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...amberWarning);
      doc.text('Consumo não calculado', xCol3, yBody + 5.5);
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('Odômetro marcado como não funcional.', xCol3, yBody + 10);
    } else if (!hasPreviousKm) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...blueBrand);
      doc.text('Consumo ainda não disponível', xCol3, yBody + 5.5);
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('É necessário um abastecimento anterior para calcular a média.', xCol3, yBody + 10);
    } else {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(`Consumo médio: ${formatConsumption(r.consumption_kml)}`, xCol3, yBody + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      const costPerKmText = r.cost_per_km ? `R$ ${Number(r.cost_per_km).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/km` : '—';
      doc.text(`Custo/km: ${costPerKmText}`, xCol3, yBody + 9.5);

      if (r.driver_name) {
        doc.setFontSize(7);
        doc.setTextColor(...textMuted);
        doc.text(`Motorista: ${r.driver_name}`, xCol3, yBody + 14);
      }
    }

    yPos += cardHeight + 3.5;
  });

  // ==============================================================================
  // 5. FOOTER NUMBERS ON ALL PAGES (Requirement 21)
  // ==============================================================================
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerenciamento de Frota • Relatório gerado em: ${generationFullStr}`, margin, pageHeight - 6.5);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  return doc;
}

// ==============================================================================
// Output Dispatchers (Download, View in New Tab, Web Share)
// ==============================================================================
export function downloadPDF(doc, filename) {
  doc.save(filename);
}

export function openPDFInViewer(doc, filename) {
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

export async function sharePDF(doc, filename, title = 'Relatório de Abastecimento - Gerenciamento de Frota') {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text: 'Segue em anexo o relatório de abastecimento da frota.',
        files: [file]
      });
      return { success: true, method: 'share' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', err);
      }
    }
  }

  // Fallback if not supported or canceled
  doc.save(filename);
  return { success: true, method: 'download' };
}

// ==============================================================================
// High-Level Session, Fleet & Individual PDF Generation Functions
// ==============================================================================
export function generateSessionPDF(session, records = [], summary = {}, action = 'download') {
  const dateFormatted = session.date ? session.date.replace(/-/g, '_') : new Date().toISOString().split('T')[0];
  const filename = `Gerenciamento_Frota_Relatorio_Semanal_${session.code || dateFormatted}.pdf`;

  const doc = createFleetPDFDoc({
    reportType: 'semanal',
    title: 'RELATÓRIO SEMANAL DE ABASTECIMENTO',
    sessionCode: session.code,
    dateStr: session.date,
    periodStr: formatDateBR(session.date),
    records,
    summary: {
      total_vehicles: summary.total_vehicles || records.length,
      total_liters: summary.total_liters || session.total_liters,
      total_cost: summary.total_cost || session.total_cost,
      fuels: summary.fuels
    }
  });

  if (action === 'view') {
    openPDFInViewer(doc, filename);
  } else if (action === 'share') {
    return sharePDF(doc, filename, `Relatório da Sessão ${session.code}`);
  } else {
    downloadPDF(doc, filename);
  }
  return doc;
}

export function generateFleetReportPDF({ filters = {}, records = [], summary = {} }, action = 'download') {
  const todayStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  
  // Distinguish Report Types
  let reportTitle = 'RELATÓRIO CONSOLIDADO DE ABASTECIMENTO';
  let reportType = 'consolidado';
  let filePrefix = 'Relatorio_Consolidado';

  if (filters.is_weekly || (filters.period && filters.period.includes('week'))) {
    reportTitle = 'RELATÓRIO SEMANAL DE ABASTECIMENTO';
    reportType = 'semanal';
    filePrefix = 'Relatorio_Semanal';
  } else if (filters.vehicle_id || filters.vehicle_name) {
    reportTitle = `RELATÓRIO INDIVIDUAL DE ABASTECIMENTO — ${filters.vehicle_name || 'VEÍCULO'}`;
    reportType = 'individual';
    filePrefix = 'Relatorio_Individual';
  }

  const filename = `Gerenciamento_Frota_${filePrefix}_${todayStr}.pdf`;

  const filterSubtitleParts = [];
  if (filters.start_date && filters.end_date) {
    filterSubtitleParts.push(`${formatDateBR(filters.start_date)} a ${formatDateBR(filters.end_date)}`);
  }
  if (filters.fuel_type) {
    filterSubtitleParts.push(`Combustível: ${filters.fuel_type}`);
  }

  const doc = createFleetPDFDoc({
    reportType,
    title: reportTitle,
    sessionCode: null,
    periodStr: filterSubtitleParts.length ? filterSubtitleParts.join(' • ') : formatDateBR(new Date().toISOString().split('T')[0]),
    dateStr: new Date().toISOString().split('T')[0],
    records,
    summary: {
      total_vehicles: summary.total_vehicles || summary.total_records || records.length,
      total_liters: summary.total_liters,
      total_cost: summary.total_cost,
      fuels: summary.fuels
    }
  });

  if (action === 'view') {
    openPDFInViewer(doc, filename);
  } else if (action === 'share') {
    return sharePDF(doc, filename, `${reportTitle} - Gerenciamento de Frota`);
  } else {
    downloadPDF(doc, filename);
  }
  return doc;
}

// ==============================================================================
// Excel Export Function
// ==============================================================================
export function generateSessionExcel(session, records = [], summary) {
  const formattedDate = formatDateBR(session.date);

  const vehicleRows = records.map((r, i) => ({
    'Item': i + 1,
    'Sessão': session.code || '-',
    'Data': formattedDate,
    'Veículo': r.vehicle_name,
    'Placa': r.vehicle_plate,
    'Combustível': r.fuel_type,
    'Odômetro': r.odometer_working === 1 ? 'Funcional' : 'Não funcional',
    'KM Anterior': r.km_previous || '-',
    'KM Atual': r.km_current || '-',
    'KM Rodados': r.km_driven || '-',
    'Litros': Number(r.liters || 0),
    'Valor / Litro (R$)': Number(r.price_per_liter || 0),
    'Valor Total (R$)': Number(r.total_cost || 0),
    'Média (km/L)': r.odometer_working === 1 && r.consumption_kml ? Number(r.consumption_kml) : 'Não calculado',
    'Custo por KM (R$/km)': r.odometer_working === 1 && r.cost_per_km ? Number(r.cost_per_km) : '-',
    'Motorista': r.driver_name || '-'
  }));

  const fuels = computeFuelSummary(records, summary);
  const fuelRows = fuels.map(f => ({
    'Tipo de Combustível': f.name,
    'Veículos': f.count,
    'Total de Litros': Number(f.liters),
    'Valor Total Gasto (R$)': Number(f.total_cost)
  }));

  const wb = XLSX.utils.book_new();
  const wsVehicles = XLSX.utils.json_to_sheet(vehicleRows);
  const wsFuels = XLSX.utils.json_to_sheet(fuelRows);

  XLSX.utils.book_append_sheet(wb, wsVehicles, 'Veículos');
  XLSX.utils.book_append_sheet(wb, wsFuels, 'Resumo Combustível');

  XLSX.writeFile(wb, `Gerenciamento_Frota_${session.code || 'Export'}.xlsx`);
}
