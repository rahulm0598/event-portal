import ExcelJS from 'exceljs';

// Builds a styled .xlsx buffer from rows of registration data.
export async function buildAttendeesXlsx({ sheetName = 'Registrations', title, regs }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MedEvents Portal';
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: title ? 2 : 1 }],
  });

  const columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Doctor ID', key: 'doctorId', width: 14 },
    { header: 'Mobile', key: 'mobile', width: 14 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Hospital', key: 'hospital', width: 24 },
    { header: 'Specialty', key: 'specialty', width: 18 },
    { header: 'Event', key: 'event', width: 24 },
    { header: 'Payment', key: 'payment', width: 12 },
    { header: 'Amount (INR)', key: 'amount', width: 14 },
    { header: 'Check-In', key: 'checkin', width: 12 },
    { header: 'Checked-In At', key: 'checkedAt', width: 22 },
    { header: 'Registered At', key: 'createdAt', width: 22 },
  ];

  let headerRowIdx = 1;
  if (title) {
    ws.mergeCells(1, 1, 1, columns.length);
    const t = ws.getCell('A1');
    t.value = title;
    t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } };
    t.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 24;
    headerRowIdx = 2;
  }

  ws.columns = columns;
  // (ws.columns resets header to row 1; re-place header if we have a title)
  const headerRow = ws.getRow(headerRowIdx);
  columns.forEach((c, i) => { headerRow.getCell(i + 1).value = c.header; });
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5BD0' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 18;

  regs.forEach((r) => {
    const s = r.snapshot || {};
    ws.addRow({
      name: s.name, doctorId: s.doctorId, mobile: s.mobile, email: s.email,
      hospital: s.hospital, specialty: s.specialty,
      event: r.eventTitle || '',
      payment: r.paymentStatus === 'not_required' ? 'free' : r.paymentStatus,
      amount: (r.amountInPaise || 0) / 100,
      checkin: r.checkInStatus === 'checked_in' ? 'Yes' : 'No',
      checkedAt: r.checkedInAt ? new Date(r.checkedInAt) : '',
      createdAt: new Date(r.createdAt),
    });
  });

  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx, column: columns.length },
  };

  return wb.xlsx.writeBuffer();
}
