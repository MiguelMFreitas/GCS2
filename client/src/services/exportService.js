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

export function getWeekRangeForDate(dateStr) {
  if (!dateStr) return { weekKey: 'unknown', startDate: '', endDate: '', label: 'Sem data' };
  const cleanDate = dateStr.split('T')[0].split(' ')[0];
  const [y, m, d] = cleanDate.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d, 12, 0, 0);
  const day = targetDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatYMD = (dt) => {
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const formatBR = (dt) => {
    const da = String(dt.getDate()).padStart(2, '0');
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const yr = dt.getFullYear();
    return `${da}/${mo}/${yr}`;
  };

  const startYMD = formatYMD(monday);
  const endYMD = formatYMD(sunday);

  return {
    weekKey: `${startYMD}_${endYMD}`,
    startDate: startYMD,
    endDate: endYMD,
    label: `Semana ${formatBR(monday)} a ${formatBR(sunday)}`
  };
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

export function ensureVehiclesData(records = [], providedVehiclesData = null) {
  if (providedVehiclesData && providedVehiclesData.length > 0) {
    return providedVehiclesData.map(v => {
      const fuelingsCount = v.summary?.fuelings_count || v.records?.length || 0;
      const totalLiters = v.summary?.total_liters || v.records?.reduce((s, r) => s + Number(r.liters || 0), 0) || 0;
      const totalCost = v.summary?.total_cost || v.records?.reduce((s, r) => s + Number(r.total_cost || 0), 0) || 0;
      const avgLiters = fuelingsCount > 0 ? Number((totalLiters / fuelingsCount).toFixed(2)) : 0;
      const avgTotalCost = fuelingsCount > 0 ? Number((totalCost / fuelingsCount).toFixed(2)) : 0;
      const avgPricePerLiter = fuelingsCount > 0 && v.records
        ? Number((v.records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / fuelingsCount).toFixed(2))
        : 0;

      return {
        ...v,
        summary: {
          ...v.summary,
          avg_liters: v.summary?.avg_liters !== undefined ? v.summary.avg_liters : avgLiters,
          avg_total_cost: v.summary?.avg_total_cost !== undefined ? v.summary.avg_total_cost : avgTotalCost,
          avg_price_per_liter: v.summary?.avg_price_per_liter !== undefined ? v.summary.avg_price_per_liter : avgPricePerLiter
        }
      };
    });
  }
  const vehicleMap = new Map();
  records.forEach(r => {
    const vId = r.vehicle_id || r.vehicle_plate || 'v1';
    if (!vehicleMap.has(vId)) {
      vehicleMap.set(vId, {
        vehicle_id: vId,
        vehicle_name: r.vehicle_name || 'Veículo',
        vehicle_plate: r.vehicle_plate || '-',
        vehicle_brand: r.vehicle_brand || '',
        vehicle_model: r.vehicle_model || '',
        vehicle_year: r.vehicle_year || `${r.year_fab || ''}/${r.year_model || ''}`.replace(/^\/|\/$/g, '') || '-',
        odometer_working: r.odometer_working,
        records: []
      });
    }
    vehicleMap.get(vId).records.push(r);
  });

  return Array.from(vehicleMap.values()).map(v => {
    v.records.sort((a, b) => {
      const dateA = a.session_date || a.fuel_date || a.created_at || '';
      const dateB = b.session_date || b.fuel_date || b.created_at || '';
      return dateA.localeCompare(dateB) || (a.id || 0) - (b.id || 0);
    });

    let totalCost = 0;
    let totalLiters = 0;
    let totalKm = 0;
    const validKmlValues = [];
    const weekMap = new Map();

    v.records.forEach(r => {
      totalCost += Number(r.total_cost || 0);
      totalLiters += Number(r.liters || 0);
      if (r.km_driven && Number(r.km_driven) > 0) {
        totalKm += Number(r.km_driven);
      }
      const isOdometerWorking = r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1';
      const kml = Number(r.consumption_kml);
      const hasValidKml = isOdometerWorking && kml > 0 && kml < 100;

      if (hasValidKml) {
        validKmlValues.push(kml);
      }

      const dateStr = r.session_date || r.fuel_date || r.created_at;
      const weekInfo = getWeekRangeForDate(dateStr);
      if (!weekMap.has(weekInfo.weekKey)) {
        weekMap.set(weekInfo.weekKey, {
          week_key: weekInfo.weekKey,
          week_label: weekInfo.label,
          start_date: weekInfo.startDate,
          end_date: weekInfo.endDate,
          fuelings_count: 0,
          total_liters: 0,
          total_cost: 0,
          total_km: 0,
          kml_values: []
        });
      }
      const w = weekMap.get(weekInfo.weekKey);
      w.fuelings_count += 1;
      w.total_liters += Number(r.liters || 0);
      w.total_cost += Number(r.total_cost || 0);
      if (r.km_driven && Number(r.km_driven) > 0) {
        w.total_km += Number(r.km_driven);
      }
      if (hasValidKml) {
        w.kml_values.push(kml);
      }
    });

    const weekly_averages = Array.from(weekMap.values())
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .map(w => ({
        week_key: w.week_key,
        week_label: w.week_label,
        start_date: w.start_date,
        end_date: w.end_date,
        fuelings_count: w.fuelings_count,
        total_liters: Number(w.total_liters.toFixed(2)),
        total_cost: Number(w.total_cost.toFixed(2)),
        total_km: Number(w.total_km.toFixed(1)),
        avg_consumption_kml: w.kml_values.length > 0
          ? Number((w.kml_values.reduce((s, val) => s + val, 0) / w.kml_values.length).toFixed(2))
          : null
      }));

    const avgKml = validKmlValues.length > 0
      ? Number((validKmlValues.reduce((s, val) => s + val, 0) / validKmlValues.length).toFixed(2))
      : null;

    const avgLiters = v.records.length > 0 ? Number((totalLiters / v.records.length).toFixed(2)) : 0;
    const avgTotalCost = v.records.length > 0 ? Number((totalCost / v.records.length).toFixed(2)) : 0;
    const avgPricePerLiter = v.records.length > 0
      ? Number((v.records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / v.records.length).toFixed(2))
      : 0;

    return {
      ...v,
      summary: {
        fuelings_count: v.records.length,
        total_cost: Number(totalCost.toFixed(2)),
        total_liters: Number(totalLiters.toFixed(2)),
        total_km: Number(totalKm.toFixed(1)),
        avg_liters: avgLiters,
        avg_total_cost: avgTotalCost,
        avg_price_per_liter: avgPricePerLiter,
        avg_consumption_kml: avgKml,
        weekly_averages
      }
    };
  });
}

// ==============================================================================
// Master PDF Generator Engine (Vehicle Grouped & End-of-Report Fleet Summary)
// ==============================================================================
export function createFleetPDFDoc({
  reportType = 'semanal', // 'semanal' | 'mensal' | 'anual' | 'consolidado' | 'individual'
  title = 'RELATÓRIO DE ABASTECIMENTO',
  sessionCode = null,
  periodStr = null,
  dateStr = null,
  records = [],
  vehicles_data = null,
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

  // Executive Palette
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

  // Process vehicles data
  const vehiclesList = ensureVehiclesData(records, vehicles_data);

  // Helper for adding new page with header
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
    yPos += 12;
  }

  // ==============================================================================
  // 1. TOP HEADER (Page 1)
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

  // Right Header Info
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
  // 2. DETALHAMENTO POR VEÍCULO (Requirements 3, 4, 5, 6, 8)
  // ==============================================================================
  vehiclesList.forEach((v, vIdx) => {
    // 2.1 Vehicle Header Bar
    checkPageBreak(35);

    const vehicleNum = String(vIdx + 1).padStart(2, '0');
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.roundedRect(margin, yPos, contentWidth, 8.5, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${vehicleNum} — ${(v.vehicle_name || 'VEÍCULO').toUpperCase()}`, margin + 4, yPos + 5.8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Placa: ${v.vehicle_plate || '-'}  •  Ano: ${v.vehicle_year || '-'}`, margin + 65, yPos + 5.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 231, 183); // Emerald
    doc.text(`${v.records.length} ${v.records.length === 1 ? 'abastecimento' : 'abastecimentos'}`, pageWidth - margin - 4, yPos + 5.8, { align: 'right' });

    yPos += 11;

    // 2.2 Individual Fuelings for this Vehicle
    v.records.forEach((r, rIdx) => {
      const isOdometerWorking = r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1';
      const hasPreviousKm = r.km_previous !== null && r.km_previous !== undefined && r.km_previous !== '' && Number(r.km_previous) > 0;
      const isSpecialCase = !isOdometerWorking || !hasPreviousKm;
      const cardHeight = isSpecialCase ? 27 : 29;

      checkPageBreak(cardHeight + 2);

      // Card Container
      doc.setFillColor(...bgCard);
      doc.setDrawColor(...slateBorder);
      doc.roundedRect(margin, yPos, contentWidth, cardHeight, 1.5, 1.5, 'FD');

      // Top mini strip of fueling
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, yPos, contentWidth, 6.5, 1.5, 1.5, 'F');
      doc.rect(margin, yPos + 4, contentWidth, 2.5, 'F');

      const dateFormatted = formatDateBR(r.session_date || r.created_at);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkNavy);
      doc.text(`Abastecimento #${rIdx + 1}  •  Data: ${dateFormatted}${r.session_code ? `  •  Sessão: ${r.session_code}` : ''}`, margin + 4, yPos + 4.5);

      doc.setTextColor(...textMuted);
      doc.setFont('helvetica', 'normal');
      doc.text(`Combustível: ${r.fuel_type || 'Diesel'}`, margin + 95, yPos + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(formatCurrency(r.total_cost), pageWidth - margin - 4, yPos + 4.5, { align: 'right' });

      // 3 Columns inside Card
      const yBody = yPos + 10;

      // Col 1: Quilometragem
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMuted);
      doc.text('QUILOMETRAGEM', margin + 4, yBody);

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      if (!isOdometerWorking) {
        doc.text('Anterior: —', margin + 4, yBody + 4.5);
        doc.text('Atual: —', margin + 4, yBody + 8.5);
        doc.text('Rodados: —', margin + 4, yBody + 12.5);
      } else if (!hasPreviousKm) {
        doc.text('Anterior: — (Primeiro)', margin + 4, yBody + 4.5);
        doc.text(`Atual: ${formatKm(r.km_current)}`, margin + 4, yBody + 8.5);
        doc.text('Rodados: —', margin + 4, yBody + 12.5);
      } else {
        doc.text(`Anterior: ${formatKm(r.km_previous)}`, margin + 4, yBody + 4.5);
        doc.text(`Atual: ${formatKm(r.km_current)}`, margin + 4, yBody + 8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...blueBrand);
        doc.text(`Rodados: ${formatKm(r.km_driven)}`, margin + 4, yBody + 12.5);
      }

      // Col 2: Abastecimento
      const xCol2 = margin + 65;
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMuted);
      doc.text('ABASTECIMENTO', xCol2, yBody);

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(`Litros: ${formatLiters(r.liters)}`, xCol2, yBody + 4.5);
      doc.text(`Preço/L: ${formatCurrency(r.price_per_liter)}`, xCol2, yBody + 8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(`Total: ${formatCurrency(r.total_cost)}`, xCol2, yBody + 12.5);

      // Col 3: Desempenho
      const xCol3 = margin + 120;
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMuted);
      doc.text('DESEMPENHO', xCol3, yBody);

      if (!isOdometerWorking) {
        doc.setFontSize(7.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...amberWarning);
        doc.text('Consumo não calculado', xCol3, yBody + 4.5);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textMuted);
        doc.text('Odômetro marcado como não funcional.', xCol3, yBody + 8.5);
      } else if (!hasPreviousKm) {
        doc.setFontSize(7.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...blueBrand);
        doc.text('Consumo ainda não disponível', xCol3, yBody + 4.5);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textMuted);
        doc.text('É necessário abastecimento anterior.', xCol3, yBody + 8.5);
      } else {
        doc.setFontSize(7.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...emeraldBrand);
        doc.text(`Consumo: ${formatConsumption(r.consumption_kml)}`, xCol3, yBody + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textDark);
        const costPerKmText = r.cost_per_km ? `R$ ${Number(r.cost_per_km).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/km` : '—';
        doc.text(`Custo/km: ${costPerKmText}`, xCol3, yBody + 8.5);

        if (r.driver_name) {
          doc.setFontSize(6.5);
          doc.setTextColor(...textMuted);
          doc.text(`Motorista: ${r.driver_name}`, xCol3, yBody + 12.5);
        }
      }

      yPos += cardHeight + 2.5;
    });

    // 2.3 Médias Semanais de Consumo do Veículo (Requirement 4)
    if (v.summary?.weekly_averages && v.summary.weekly_averages.length > 1) {
      checkPageBreak(14);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(...slateBorder);
      doc.roundedRect(margin, yPos, contentWidth, 10, 1.5, 1.5, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textMuted);
      doc.text('MÉDIAS DE CONSUMO POR SEMANA:', margin + 4, yPos + 4);

      const weekStrings = v.summary.weekly_averages.map(w => {
        const val = w.avg_consumption_kml ? `${Number(w.avg_consumption_kml).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} km/L` : '—';
        return `${w.week_label}: ${val}`;
      });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(weekStrings.join('   |   '), margin + 4, yPos + 8);

      yPos += 12;
    }

    // 2.4 Resumo / Médias do Veículo no Período (Requirements 4, 5)
    checkPageBreak(24);
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(167, 243, 208); // Emerald 200
    doc.roundedRect(margin, yPos, contentWidth, 19, 1.5, 1.5, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70); // Emerald 800
    doc.text(`RESUMO / MÉDIAS DO VEÍCULO (${(v.vehicle_name || '').toUpperCase()} — ${v.vehicle_plate || '-'}):`, margin + 4, yPos + 4.5);

    const kmText = v.summary.total_km > 0 ? `${Number(v.summary.total_km).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km` : '—';
    const mediaText = v.summary.avg_consumption_kml ? `${Number(v.summary.avg_consumption_kml).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} km/L` : 'Não disponível';
    const avgLitersVal = v.summary.avg_liters || (v.summary.fuelings_count > 0 ? v.summary.total_liters / v.summary.fuelings_count : 0);
    const avgCostVal = v.summary.avg_total_cost || (v.summary.fuelings_count > 0 ? v.summary.total_cost / v.summary.fuelings_count : 0);
    const avgPriceVal = v.summary.avg_price_per_liter || (v.summary.fuelings_count > 0 ? v.records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / v.summary.fuelings_count : 0);

    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    doc.text(
      `Total de Abastecimentos: ${v.summary.fuelings_count}   •   Média de Litros: ${formatLiters(avgLitersVal)}   •   Média de Preço/L: ${formatCurrency(avgPriceVal)}   •   Média de Valor: ${formatCurrency(avgCostVal)}`,
      margin + 4,
      yPos + 9.5
    );
    doc.text(
      `Total Gasto: ${formatCurrency(v.summary.total_cost)}   •   Total Litros: ${formatLiters(v.summary.total_liters)}   •   KM Rodados: ${kmText}   •   Média de Consumo: `,
      margin + 4,
      yPos + 14.5
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...emeraldBrand);
    doc.text(mediaText, margin + 148, yPos + 14.5);

    yPos += 23;
  });

  // ==============================================================================
  // 3. RESUMO GERAL DA FROTA (Ao final do relatório - Requirements 5, 7, 8)
  // ==============================================================================
  checkPageBreak(50);

  doc.setFillColor(...darkNavy);
  doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`RESUMO GERAL DA FROTA — ${formattedPeriod.toUpperCase()}`, margin + 4, yPos + 5.5);
  yPos += 11;

  // 4 Executive KPI Cards
  const totalVehiclesCount = summary?.total_vehicles || vehiclesList.length;
  const totalFuelingsCount = summary?.total_records || records.length;
  const totalLitersVal = Number(summary?.total_liters || records.reduce((s, r) => s + Number(r.liters || 0), 0));
  const totalCostVal = Number(summary?.total_cost || records.reduce((s, r) => s + Number(r.total_cost || 0), 0));
  const totalKmVal = Number(summary?.total_km || records.reduce((s, r) => s + (Number(r.km_driven) > 0 ? Number(r.km_driven) : 0), 0));
  const fleetAvgKml = summary?.avg_consumption_kml || null;
  const fleetAvgLitersPerFueling = totalFuelingsCount > 0 ? totalLitersVal / totalFuelingsCount : 0;
  const fleetAvgCostPerFueling = totalFuelingsCount > 0 ? totalCostVal / totalFuelingsCount : 0;
  const fleetAvgPricePerLiter = totalFuelingsCount > 0 ? (records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / totalFuelingsCount) : 0;

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

  // Card 2: TOTAL ABASTECIMENTOS
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

  // Card 4: VALOR TOTAL DA FROTA
  const xCard4 = margin + ((colWidth + cardSpacing) * 3);
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(xCard4, yPos, colWidth, 18, 2, 2, 'FD');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('VALOR TOTAL DA FROTA', xCard4 + 3.5, yPos + 5.5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldBrand);
  doc.text(formatCurrency(totalCostVal), xCard4 + 3.5, yPos + 13.5);

  yPos += 22;

  // Fleet Detailed Averages Card (Requirement 5)
  checkPageBreak(16);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...slateBorder);
  doc.roundedRect(margin, yPos, contentWidth, 13, 1.5, 1.5, 'FD');

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(
    `MÉDIAS GERAIS DA FROTA:   Média Litros/Abastecimento: ${formatLiters(fleetAvgLitersPerFueling)}   •   Média Valor/Abastecimento: ${formatCurrency(fleetAvgCostPerFueling)}   •   Média Preço/Litro: ${formatCurrency(fleetAvgPricePerLiter)}`,
    margin + 4,
    yPos + 5
  );

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`Quilômetros Rodados na Frota: ${totalKmVal > 0 ? formatKm(totalKmVal) : '—'}`, margin + 4, yPos + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldBrand);
  const fleetAvgText = fleetAvgKml ? `${Number(fleetAvgKml).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} km/L` : '—';
  doc.text(`Média Geral de Consumo da Frota: ${fleetAvgText}`, pageWidth - margin - 4, yPos + 9.5, { align: 'right' });

  yPos += 16;

  // Fuel Type Summary
  const fuels = computeFuelSummary(records, summary);
  if (fuels.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkNavy);
    doc.text('CONSOLIDAÇÃO POR COMBUSTÍVEL', margin, yPos);
    yPos += 3.5;

    const fuelCardCount = Math.min(fuels.length, 3);
    const fuelCardWidth = (contentWidth - ((fuelCardCount - 1) * 4)) / fuelCardCount;

    fuels.forEach((fuel, idx) => {
      const isDiesel = fuel.name.toUpperCase().includes('DIESEL');
      const isGasolina = fuel.name.toUpperCase().includes('GASOLINA');
      const xFuel = margin + (idx * (fuelCardWidth + 4));

      doc.setFillColor(...bgCard);
      doc.setDrawColor(...slateBorder);
      doc.roundedRect(xFuel, yPos, fuelCardWidth, 18, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isDiesel ? 22 : (isGasolina ? 2 : 180), isDiesel ? 101 : (isGasolina ? 132 : 83), isDiesel ? 52 : (isGasolina ? 199 : 9));
      doc.text(fuel.name.toUpperCase(), xFuel + 4, yPos + 5);

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(`${fuel.count} ${fuel.count === 1 ? 'abastecimento' : 'abastecimentos'}  •  ${formatLiters(fuel.liters)}`, xFuel + 4, yPos + 10);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(`${formatCurrency(fuel.total_cost)} gastos`, xFuel + 4, yPos + 15);
    });

    yPos += 22;
  }

  // ==============================================================================
  // 4. FOOTER NUMBERS ON ALL PAGES
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
  if (typeof doc?.save === 'function') {
    doc.save(filename);
  }
}

export function openPDFInViewer(doc, filename) {
  if (typeof window === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return doc;
  }
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

export function generateFleetReportPDF({ filters = {}, records = [], vehicles_data = null, summary = {} }, action = 'download') {
  const todayStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  
  let reportTitle = 'RELATÓRIO DE GESTÃO DE FROTA';
  let reportType = 'consolidado';
  let filePrefix = 'Relatorio_Frota';

  if (filters.is_weekly || (filters.period && filters.period.includes('week'))) {
    reportTitle = 'RELATÓRIO SEMANAL DE ABASTECIMENTO';
    reportType = 'semanal';
    filePrefix = 'Relatorio_Semanal';
  } else if (filters.vehicle_id || filters.vehicle_name) {
    reportTitle = `RELATÓRIO INDIVIDUAL DO VEÍCULO — ${filters.vehicle_name || 'VEÍCULO'}`;
    reportType = 'individual';
    filePrefix = 'Relatorio_Individual';
  } else if (filters.period_label) {
    reportTitle = `RELATÓRIO DE GESTÃO DE FROTA — ${filters.period_label.toUpperCase()}`;
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
    vehicles_data,
    summary: {
      total_vehicles: summary.total_vehicles || summary.total_records || records.length,
      total_records: summary.total_records || records.length,
      total_liters: summary.total_liters,
      total_cost: summary.total_cost,
      total_km: summary.total_km,
      avg_consumption_kml: summary.avg_consumption_kml,
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

export function generateFleetExcelReport({ filters = {}, records = [], vehicles_data = null, summary = {} }) {
  const vehiclesList = ensureVehiclesData(records, vehicles_data);
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Grouped Vehicle Rows with headers and averages
  const vehicleRows = [];
  let itemIndex = 1;

  vehiclesList.forEach((v) => {
    // Add Vehicle Section Header Row
    vehicleRows.push({
      'Item': `🚗 ${v.vehicle_name?.toUpperCase()} (${v.vehicle_plate || '-'})`,
      'Data': `Marca: ${v.vehicle_brand || '-'}`,
      'Veículo': `Ano: ${v.vehicle_year || '-'}`,
      'Placa': v.odometer_working === 1 ? 'Odômetro Funcional' : 'Sem Odômetro',
      'Combustível': '',
      'KM Anterior': '',
      'KM Atual': '',
      'KM Rodados': '',
      'Litros': '',
      'Valor / Litro (R$)': '',
      'Valor Total (R$)': '',
      'Média (km/L)': '',
      'Custo por KM (R$/km)': '',
      'Motorista': '',
      'Posto': ''
    });

    // Individual Fuelings
    v.records.forEach((r) => {
      vehicleRows.push({
        'Item': itemIndex++,
        'Data': formatDateBR(r.session_date || r.fuel_date || r.created_at),
        'Veículo': r.vehicle_name,
        'Placa': r.vehicle_plate,
        'Combustível': r.fuel_type || 'Diesel S10',
        'KM Anterior': r.km_previous !== null && r.km_previous !== undefined ? Number(r.km_previous) : '-',
        'KM Atual': r.km_current !== null && r.km_current !== undefined ? Number(r.km_current) : '-',
        'KM Rodados': r.km_driven !== null && r.km_driven !== undefined ? Number(r.km_driven) : '-',
        'Litros': Number(r.liters || 0),
        'Valor / Litro (R$)': Number(r.price_per_liter || 0),
        'Valor Total (R$)': Number(r.total_cost || 0),
        'Média (km/L)': r.odometer_working === 1 && r.consumption_kml ? Number(r.consumption_kml) : 'Não calculado',
        'Custo por KM (R$/km)': r.odometer_working === 1 && r.cost_per_km ? Number(r.cost_per_km) : '-',
        'Motorista': r.driver_name || '-',
        'Posto': r.fuel_station || '-'
      });
    });

    // Vehicle Averages / Summary Row (Requirement 4)
    const avgLiters = v.summary.avg_liters || (v.summary.fuelings_count > 0 ? v.summary.total_liters / v.summary.fuelings_count : 0);
    const avgPrice = v.summary.avg_price_per_liter || (v.summary.fuelings_count > 0 ? v.records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / v.summary.fuelings_count : 0);
    const avgCost = v.summary.avg_total_cost || (v.summary.fuelings_count > 0 ? v.summary.total_cost / v.summary.fuelings_count : 0);

    vehicleRows.push({
      'Item': '📊 MÉDIAS DO VEÍCULO',
      'Data': `Abastecimentos: ${v.summary.fuelings_count}`,
      'Veículo': `Média Litros: ${avgLiters.toFixed(2)} L`,
      'Placa': `Média Preço/L: R$ ${avgPrice.toFixed(2)}`,
      'Combustível': `Média Valor: R$ ${avgCost.toFixed(2)}`,
      'KM Anterior': `Total Gasto: R$ ${Number(v.summary.total_cost || 0).toFixed(2)}`,
      'KM Atual': `Total Litros: ${Number(v.summary.total_liters || 0).toFixed(2)} L`,
      'KM Rodados': `Total KM: ${Number(v.summary.total_km || 0).toFixed(1)} km`,
      'Litros': '',
      'Valor / Litro (R$)': '',
      'Valor Total (R$)': '',
      'Média (km/L)': v.summary.avg_consumption_kml ? `${Number(v.summary.avg_consumption_kml).toFixed(2)} km/L` : 'Não disponível',
      'Custo por KM (R$/km)': '',
      'Motorista': '',
      'Posto': ''
    });

    // Separator Empty Row
    vehicleRows.push({});
  });

  // 2. Fleet Summary Sheet (Requirement 5)
  const totalVehiclesCount = summary?.total_vehicles || vehiclesList.length;
  const totalFuelingsCount = summary?.total_records || records.length;
  const totalLitersVal = Number(summary?.total_liters || records.reduce((s, r) => s + Number(r.liters || 0), 0));
  const totalCostVal = Number(summary?.total_cost || records.reduce((s, r) => s + Number(r.total_cost || 0), 0));
  const totalKmVal = Number(summary?.total_km || records.reduce((s, r) => s + (Number(r.km_driven) > 0 ? Number(r.km_driven) : 0), 0));
  const fleetAvgKml = summary?.avg_consumption_kml || null;
  const fleetAvgLiters = totalFuelingsCount > 0 ? totalLitersVal / totalFuelingsCount : 0;
  const fleetAvgCost = totalFuelingsCount > 0 ? totalCostVal / totalFuelingsCount : 0;
  const fleetAvgPrice = totalFuelingsCount > 0 ? (records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / totalFuelingsCount) : 0;

  const fleetSummaryRows = [
    { 'Indicador': 'Total de Veículos Abastecidos', 'Valor': totalVehiclesCount },
    { 'Indicador': 'Total de Abastecimentos Realizados', 'Valor': totalFuelingsCount },
    { 'Indicador': 'Total de Litros Consumidos', 'Valor': `${totalLitersVal.toFixed(2)} L` },
    { 'Indicador': 'Valor Total Gasto', 'Valor': `R$ ${totalCostVal.toFixed(2)}` },
    { 'Indicador': 'Quilômetros Rodados na Frota', 'Valor': `${totalKmVal.toFixed(1)} km` },
    { 'Indicador': 'Média Geral de Litros por Abastecimento', 'Valor': `${fleetAvgLiters.toFixed(2)} L` },
    { 'Indicador': 'Média Geral de Valor por Abastecimento', 'Valor': `R$ ${fleetAvgCost.toFixed(2)}` },
    { 'Indicador': 'Média Geral de Preço por Litro', 'Valor': `R$ ${fleetAvgPrice.toFixed(2)}` },
    { 'Indicador': 'Média Geral de Consumo da Frota', 'Valor': fleetAvgKml ? `${Number(fleetAvgKml).toFixed(2)} km/L` : 'Não disponível' }
  ];

  // 3. Fuels Sheet
  const fuels = computeFuelSummary(records, summary);
  const fuelRows = fuels.map(f => ({
    'Tipo de Combustível': f.name,
    'Abastecimentos': f.count,
    'Total de Litros': Number(f.liters),
    'Valor Total Gasto (R$)': Number(f.total_cost)
  }));

  const wb = XLSX.utils.book_new();
  const wsVehicles = XLSX.utils.json_to_sheet(vehicleRows);
  const wsSummary = XLSX.utils.json_to_sheet(fleetSummaryRows);
  const wsFuels = XLSX.utils.json_to_sheet(fuelRows);

  XLSX.utils.book_append_sheet(wb, wsVehicles, 'Abastecimentos por Veículo');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral da Frota');
  XLSX.utils.book_append_sheet(wb, wsFuels, 'Consolidação Combustível');

  XLSX.writeFile(wb, `Gerenciamento_Frota_Relatorio_${todayStr}.xlsx`);
}

