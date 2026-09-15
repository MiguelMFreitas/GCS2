import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export function generateSessionPDF(session, records = [], summary) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Corporate Color Palette
  const darkNavy = [15, 23, 42];      // #0f172a
  const slateBorder = [203, 213, 225]; // #cbd5e1
  const bgCard = [248, 250, 252];      // #f8fafc
  const textMuted = [100, 116, 139];   // #64748b
  const textDark = [15, 23, 42];
  const emeraldBrand = [22, 163, 74];  // #16a34a
  const blueBrand = [2, 132, 199];     // #0284c7

  const formattedDate = session.date ? session.date.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
  let yPos = 14;

  // Helper for adding new page with header
  function checkPageBreak(neededHeight) {
    if (yPos + neededHeight > pageHeight - 16) {
      doc.addPage();
      yPos = 16;
      drawPageHeaderMini();
    }
  }

  function drawPageHeaderMini() {
    doc.setFillColor(...darkNavy);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`GCS2 • RELATÓRIO DE ABASTECIMENTO • SESSÃO: ${session.code} • ${formattedDate}`, margin + 4, yPos + 5.5);
    yPos += 12;
  }

  // ==========================================
  // 1. TOP HEADER (Item 11)
  // ==========================================
  doc.setFillColor(...darkNavy);
  doc.roundedRect(margin, yPos, contentWidth, 26, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE ABASTECIMENTO', margin + 6, yPos + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Sessão: ${session.code}  •  Sistema de Gestão de Frota GCS2`, margin + 6, yPos + 18);

  // Right Header Meta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Data: ${formattedDate}`, pageWidth - margin - 6, yPos + 10, { align: 'right' });
  doc.setTextColor(74, 222, 128); // Emerald light
  doc.text(`Quantidade de veículos: ${summary?.total_vehicles || records.length}`, pageWidth - margin - 6, yPos + 18, { align: 'right' });

  yPos += 31;

  // ==========================================
  // 2. RESUMO GERAL (Item 12: 3 Cards/Blocos)
  // ==========================================
  const colWidth = (contentWidth - 8) / 3;

  // Card 1: Total de Veículos
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...slateBorder);
  doc.roundedRect(margin, yPos, colWidth, 20, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('TOTAL DE VEÍCULOS', margin + 5, yPos + 6);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(`${summary?.total_vehicles || records.length} veículos`, margin + 5, yPos + 15);

  // Card 2: Total de Litros
  doc.setFillColor(...bgCard);
  doc.roundedRect(margin + colWidth + 4, yPos, colWidth, 20, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('TOTAL DE LITROS', margin + colWidth + 9, yPos + 6);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...blueBrand);
  doc.text(`${Number(summary?.total_liters || session.total_liters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L`, margin + colWidth + 9, yPos + 15);

  // Card 3: Valor Total (Destacado)
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin + (colWidth * 2) + 8, yPos, colWidth, 20, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('VALOR TOTAL PAGO', margin + (colWidth * 2) + 13, yPos + 6);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldBrand);
  doc.text(`R$ ${Number(summary?.total_cost || session.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + (colWidth * 2) + 13, yPos + 15);

  yPos += 25;

  // ==========================================
  // 3. SEPARAR POR COMBUSTÍVEL (Item 13)
  // ==========================================
  const fuels = summary?.fuels || [];
  if (fuels.length > 0) {
    const fuelCardWidth = (contentWidth - ((fuels.length - 1) * 4)) / fuels.length;

    fuels.forEach((fuel, idx) => {
      const isGasolina = fuel.name.toUpperCase().includes('GASOLINA');
      const isDiesel = fuel.name.toUpperCase().includes('DIESEL');
      const xCard = margin + (idx * (fuelCardWidth + 4));

      doc.setFillColor(isDiesel ? 240 : (isGasolina ? 240 : 254), isDiesel ? 253 : (isGasolina ? 249 : 243), isDiesel ? 244 : (isGasolina ? 255 : 199));
      doc.setDrawColor(...slateBorder);
      doc.roundedRect(xCard, yPos, fuelCardWidth, 24, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isDiesel ? 22 : (isGasolina ? 2 : 180), isDiesel ? 101 : (isGasolina ? 132 : 83), isDiesel ? 52 : (isGasolina ? 199 : 9));
      doc.text(`${isDiesel ? '🚚' : (isGasolina ? '⛽' : '🌿')} ${fuel.name.toUpperCase()}`, xCard + 4, yPos + 7);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(`${fuel.count} ${fuel.count === 1 ? 'veículo' : 'veículos'}  •  ${Number(fuel.liters).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} litros`, xCard + 4, yPos + 13);
      doc.text(`Preço médio: R$ ${Number(fuel.avg_price_per_liter).toFixed(2)}/L`, xCard + 4, yPos + 18);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(`R$ ${Number(fuel.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, xCard + fuelCardWidth - 4, yPos + 18, { align: 'right' });
    });

    yPos += 29;
  }

  // ==========================================
  // 4. TOTAL DO ABASTECIMENTO (Item 14: Super Destacado)
  // ==========================================
  doc.setFillColor(...darkNavy);
  doc.setDrawColor(30, 41, 59);
  doc.roundedRect(margin, yPos, contentWidth, 22, 3, 3, 'FD');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DO ABASTECIMENTO', margin + 6, yPos + 8);

  // Fuel breakdown summary text
  const fuelSummaryLine = fuels.map(f => `${f.name}: ${Number(f.liters).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L — R$ ${Number(f.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('   |   ');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(fuelSummaryLine || `Total Litros: ${summary?.total_liters} L`, margin + 6, yPos + 16);

  // Big Highlight Total on the Right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 222, 128);
  doc.text('VALOR TOTAL PAGO:', pageWidth - margin - 6, yPos + 8, { align: 'right' });
  doc.setFontSize(13);
  doc.setTextColor(74, 222, 128);
  doc.text(`R$ ${Number(summary?.total_cost || session.total_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 6, yPos + 16, { align: 'right' });

  yPos += 28;

  // ==========================================
  // 5. DADOS DE CADA VEÍCULO EM CARDS (Items 15 & 16)
  // ==========================================
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text(`DETALHAMENTO POR VEÍCULO (${records.length} VEÍCULOS ABASTECIDOS)`, margin, yPos);
  yPos += 4;

  records.forEach((r, idx) => {
    const isOdometerWorking = r.odometer_working === 1;
    const cardHeight = isOdometerWorking ? 36 : 28;

    checkPageBreak(cardHeight + 4);

    // Vehicle Card Container
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...slateBorder);
    doc.roundedRect(margin, yPos, contentWidth, cardHeight, 2, 2, 'FD');

    // Card Header Bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos, contentWidth, 9, 2, 2, 'F');
    doc.rect(margin, yPos + 6, contentWidth, 3, 'F'); // square bottom of header

    // Vehicle Name & Number
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkNavy);
    doc.text(`${idx + 1}. ${r.vehicle_name || 'Veículo'}`, margin + 4, yPos + 6);

    // License Plate Badge
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.text(`[ ${r.vehicle_plate || '-'} ]`, margin + 65, yPos + 6);

    // Fuel Type & Cost
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text(`Combustível: ${r.fuel_type || 'Diesel'}`, margin + 110, yPos + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...emeraldBrand);
    doc.text(`R$ ${Number(r.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, yPos + 6, { align: 'right' });

    // Card Body Metrics Grid
    if (isOdometerWorking) {
      // Row 1: KM Info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('KM Anterior:', margin + 4, yPos + 15);
      doc.setTextColor(...textDark);
      doc.text(r.km_previous ? `${Number(r.km_previous).toLocaleString('pt-BR')} km` : '-', margin + 28, yPos + 15);

      doc.setTextColor(...textMuted);
      doc.text('KM Atual:', margin + 65, yPos + 15);
      doc.setTextColor(...textDark);
      doc.text(r.km_current ? `${Number(r.km_current).toLocaleString('pt-BR')} km` : '-', margin + 83, yPos + 15);

      doc.setTextColor(...textMuted);
      doc.text('KM Rodados:', margin + 125, yPos + 15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...blueBrand);
      doc.text(r.km_driven ? `${Number(r.km_driven).toLocaleString('pt-BR')} km` : '-', margin + 148, yPos + 15);

      // Row 2: Fueling & Prices
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('Litros:', margin + 4, yPos + 23);
      doc.setTextColor(...textDark);
      doc.text(`${Number(r.liters).toFixed(2)} L`, margin + 28, yPos + 23);

      doc.setTextColor(...textMuted);
      doc.text('Valor/Litro:', margin + 65, yPos + 23);
      doc.setTextColor(...textDark);
      doc.text(`R$ ${Number(r.price_per_liter).toFixed(2)}`, margin + 83, yPos + 23);

      doc.setTextColor(...textMuted);
      doc.text('Valor Pago:', margin + 125, yPos + 23);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(`R$ ${Number(r.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 148, yPos + 23);

      // Row 3: Consumption & Cost per KM
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('Consumo Médio:', margin + 4, yPos + 31);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(r.consumption_kml ? `${Number(r.consumption_kml).toFixed(2)} km/L` : 'Não calculado', margin + 28, yPos + 31);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('Custo por KM:', margin + 65, yPos + 31);
      doc.setTextColor(...textDark);
      doc.text(r.cost_per_km ? `R$ ${Number(r.cost_per_km).toFixed(2)}/km` : '-', margin + 88, yPos + 31);

      if (r.driver_name) {
        doc.setTextColor(...textMuted);
        doc.text(`Motorista: ${r.driver_name}`, margin + 125, yPos + 31);
      }
    } else {
      // Non-working odometer vehicle (Item 16)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text('Litros:', margin + 4, yPos + 16);
      doc.setTextColor(...textDark);
      doc.text(`${Number(r.liters).toFixed(2)} L`, margin + 22, yPos + 16);

      doc.setTextColor(...textMuted);
      doc.text('Valor por Litro:', margin + 60, yPos + 16);
      doc.setTextColor(...textDark);
      doc.text(`R$ ${Number(r.price_per_liter).toFixed(2)}`, margin + 85, yPos + 16);

      doc.setTextColor(...textMuted);
      doc.text('Valor Abastecido:', margin + 125, yPos + 16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...emeraldBrand);
      doc.text(`R$ ${Number(r.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 155, yPos + 16);

      // Warning badge: Consumo não calculado — odômetro não funcional
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6); // Amber
      doc.text('⚠️ Consumo não calculado — odômetro não funcional.', margin + 4, yPos + 24);
    }

    yPos += cardHeight + 4;
  });

  // ==========================================
  // Footer Page Numbers
  // ==========================================
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `GCS2 Gestão de Frota • Relatório gerado em ${new Date().toLocaleString('pt-BR')} • Página ${i} de ${pageCount}`,
      margin,
      pageHeight - 8
    );
  }

  doc.save(`Relatorio_Abastecimento_${session.code}.pdf`);
}

export function generateSessionExcel(session, records = [], summary) {
  const formattedDate = session.date ? session.date.split('-').reverse().join('/') : '';

  const vehicleRows = records.map((r, i) => ({
    'Item': i + 1,
    'Sessão': session.code,
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

  const fuelRows = (summary?.fuels || []).map(f => ({
    'Tipo de Combustível': f.name,
    'Veículos': f.count,
    'Total de Litros': Number(f.liters),
    'Preço Médio / Litro (R$)': Number(f.avg_price_per_liter),
    'Valor Total Gasto (R$)': Number(f.total_cost)
  }));

  const wb = XLSX.utils.book_new();
  const wsVehicles = XLSX.utils.json_to_sheet(vehicleRows);
  const wsFuels = XLSX.utils.json_to_sheet(fuelRows);

  XLSX.utils.book_append_sheet(wb, wsVehicles, 'Veículos');
  XLSX.utils.book_append_sheet(wb, wsFuels, 'Resumo Combustível');

  XLSX.writeFile(wb, `Abastecimento_${session.code}.xlsx`);
}
