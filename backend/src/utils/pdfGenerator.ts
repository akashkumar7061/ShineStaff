import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface PayslipData {
  workerName: string;
  workerId: string;
  month: string;
  company: string;
  phone: string;
  dailySalary: number;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  absentDays: number;
  fuelKms: number;
  fuelAllowance: number;
  advanceDeducted: number;
  netSalary: number;
}

export const generatePayslipPDF = (res: Response, data: PayslipData) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=payslip-${data.workerName.replace(/\s+/g, '_')}-${data.month}.pdf`);

  doc.pipe(res);

  // Logo / Header Section
  doc.fontSize(22).fillColor('#0F172A').text(data.company.toUpperCase(), { align: 'center' });
  doc.fontSize(10).fillColor('#64748B').text('SHINESTAFF PAYROLL SYSTEM', { align: 'center' });
  doc.moveDown(1.5);

  // Divider
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1.5);

  // Invoice / Payslip Info
  doc.fontSize(14).fillColor('#0F172A').text(`PAYSLIP FOR PERIOD: ${data.month}`, { underline: true });
  doc.moveDown(0.5);

  // Two columns for employee/company info
  const startY = doc.y;
  doc.fontSize(10).fillColor('#0F172A');
  doc.text(`Employee Name:`, 50, startY);
  doc.text(data.workerName, 170, startY);

  doc.text(`Worker ID:`, 50, startY + 18);
  doc.text(data.workerId, 170, startY + 18);

  doc.text(`Phone:`, 50, startY + 36);
  doc.text(data.phone, 170, startY + 36);

  // Column 2 (Right side)
  doc.text(`Date of Issue:`, 320, startY);
  doc.text(new Date().toLocaleDateString(), 420, startY);

  doc.text(`Daily Wage Rate:`, 320, startY + 18);
  doc.text(`₹${data.dailySalary}`, 420, startY + 18);

  doc.moveDown(4.5);

  // Divider
  doc.strokeColor('#E2E8F0').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1.5);

  // Table Headers
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A').text('EARNINGS & DEDUCTIONS BREAKDOWN');
  doc.moveDown(0.8);

  const tableTop = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor('#64748B');
  doc.text('Description', 50, tableTop);
  doc.text('Quantity / Days', 250, tableTop, { width: 100, align: 'right' });
  doc.text('Rate / Value', 350, tableTop, { width: 100, align: 'right' });
  doc.text('Total', 450, tableTop, { width: 100, align: 'right' });

  doc.moveDown(0.5);
  doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.8);

  // Data rows
  interface RowItem {
    desc: string;
    qty: string;
    rate: string;
    total: string;
    isDeduction?: boolean;
  }

  const rows: RowItem[] = [
    {
      desc: 'Base Present Wage',
      qty: `${data.presentDays} Days`,
      rate: `₹${data.dailySalary}`,
      total: `₹${data.presentDays * data.dailySalary}`
    },
    {
      desc: 'Half Day Wage',
      qty: `${data.halfDays} Days`,
      rate: `₹${data.dailySalary / 2}`,
      total: `₹${data.halfDays * (data.dailySalary / 2)}`
    },
    {
      desc: 'Late-in Days (Penalized)',
      qty: `${data.lateDays} Days`,
      rate: '₹0',
      total: '₹0'
    },
    {
      desc: 'Absent Days (Unpaid)',
      qty: `${data.absentDays} Days`,
      rate: '₹0',
      total: '₹0'
    },
    {
      desc: 'Fuel Travel Allowance',
      qty: `${data.fuelKms} KM`,
      rate: '-',
      total: `₹${data.fuelAllowance}`
    },
    {
      desc: 'Advance Salary Deductions',
      qty: '-',
      rate: '-',
      total: `-₹${data.advanceDeducted}`,
      isDeduction: true
    }
  ];

  let currentY = doc.y;
  rows.forEach((row) => {
    doc.font('Helvetica').fontSize(10).fillColor('#0F172A');
    doc.text(row.desc, 50, currentY);
    doc.text(row.qty, 250, currentY, { width: 100, align: 'right' });
    doc.text(row.rate, 350, currentY, { width: 100, align: 'right' });
    if (row.isDeduction) {
      doc.fillColor('#EF4444');
    } else {
      doc.fillColor('#22C55E');
    }
    doc.text(row.total, 450, currentY, { width: 100, align: 'right' });
    currentY += 20;
  });

  doc.moveDown(1.5);
  doc.strokeColor('#94A3B8').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1.5);

  // Grand Total
  const totalY = doc.y;
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F172A').text('Net Salary Payable:', 50, totalY);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#2563EB').text(`₹${data.netSalary}`, 450, totalY, { width: 100, align: 'right' });

  // Signature Block
  doc.moveDown(4);
  const sigY = doc.y;
  doc.font('Helvetica').fontSize(9).fillColor('#64748B');
  doc.text('Prepared By: ShineStaff Admin Team', 50, sigY);
  doc.text('Employee Signature', 400, sigY, { width: 150, align: 'center' });
  doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(400, sigY - 5).lineTo(545, sigY - 5).stroke();

  doc.end();
};
