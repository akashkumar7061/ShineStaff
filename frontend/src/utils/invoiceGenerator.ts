import { jsPDF } from 'jspdf';

// Helper to convert image url to HTMLImageElement
const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export const generateInvoicePDF = async (job: any): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const companyInfo = {
    SofaShine: {
      name: "SofaShine",
      tagline: "SofaShine",
      logo: window.location.origin + "/logos/sofashine_logo.png",
      address: `Plot No. 66, Upper Ground Floor, A-Block,
Bhagwati Garden Road, Uttam Nagar,
New Delhi – 110059, India`,
      phone: "+91 89202 30357 / +91 93155 76914",
      email: "sofashine.in@gmail.com",
      gst: "07ERPPR3186G1Z5",
      website: "https://sofashine.in",
      accent: [124, 58, 237], // #7c3aed
      terms: [
        "Payment due on completion of service.",
        "Prices may vary based on actual condition of items.",
        "GST included in all prices."
      ],
      notes: "Thank you for choosing SofaShine.",
      signature: "",
      stamp: ""
    },
    CleanCruisers: {
      name: "CleanCruisers",
      tagline: "CleanCruisers",
      logo: window.location.origin + "/logos/cleancruisers_logo.png",
      address: `Plot No. 66, Upper Ground Floor, A-Block,
Bhagwati Garden Road, Uttam Nagar,
New Delhi – 110059, India`,
      phone: "+91 89202 30357 / +91 93155 76914",
      email: "cleancruisers.in@gmail.com",
      gst: "07ERPPR3186G1Z5",
      website: "https://cleancruisers.in",
      accent: [22, 163, 74], // #16a34a
      terms: [
        "Payment due on completion of service.",
        "Prices may vary for luxury / vintage vehicles.",
        "GST included in all prices."
      ],
      notes: "Thank you for choosing CleanCruisers.",
      signature: window.location.origin + "/logos/cleancruisers_sig.png",
      stamp: window.location.origin + "/logos/cleancruisers_stamp.png"
    }
  };

  const comp = companyInfo[job.company as keyof typeof companyInfo] || companyInfo.SofaShine;
  const invNumber = job.visitId || `INV-${job._id?.slice(-6).toUpperCase() || '101'}`;
  const invDate = job.date ? new Date(job.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Load logo, signature and stamp images
  const [logoImg, sigImg, stampImg] = await Promise.all([
    loadImage(comp.logo),
    loadImage(comp.signature),
    loadImage(comp.stamp)
  ]);

  // Page layout variables
  const margin = 15;
  const accentColor = comp.accent;
  
  // Header accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, 210, 4, 'F');

  // Company Logo & Name
  let y = 15;
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', margin, y, 12, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(comp.name, margin + 15, y + 9);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(comp.name, margin, y + 9);
  }

  // Invoice Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(30, 41, 59);
  doc.text("INVOICE", 145, y + 9);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(comp.tagline.toUpperCase(), margin, y);
  
  y += 4;
  const addressLines = comp.address.split('\n');
  addressLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });
  
  doc.text(`Phone: ${comp.phone}`, margin, y);
  y += 4;
  doc.text(`Email: ${comp.email}`, margin, y);
  y += 4;
  doc.text(`GSTIN: ${comp.gst}`, margin, y);

  // Invoice Metadata (Right side)
  let rightY = 37;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  
  doc.text(`Invoice No:`, 145, rightY);
  doc.setFont("helvetica", "normal");
  doc.text(invNumber, 170, rightY);
  
  rightY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`Date:`, 145, rightY);
  doc.setFont("helvetica", "normal");
  doc.text(invDate, 170, rightY);

  rightY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`Due Date:`, 145, rightY);
  doc.setFont("helvetica", "normal");
  doc.text(invDate, 170, rightY);

  // Draw separator line
  y = Math.max(y, rightY) + 6;
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, 210 - margin, y);

  // Billed To & Payment Mode
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("BILLED TO:", margin, y);
  doc.text("PAYMENT MODE:", 145, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(job.clientName, margin, y);
  doc.text("UPI / Cash", 145, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${job.clientPhone}`, margin, y);
  
  y += 4;
  const clientAddrLines = doc.splitTextToSize(job.address, 100);
  clientAddrLines.forEach((line: string) => {
    doc.text(line, margin, y);
    y += 4;
  });

  // Items Table
  y += 6;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, y, 180, 7, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("SERVICE DESCRIPTION", margin + 2, y + 4.5);
  doc.text("QTY", margin + 105, y + 4.5, { align: 'center' });
  doc.text("RATE (INR)", margin + 135, y + 4.5, { align: 'right' });
  doc.text("AMOUNT (INR)", margin + 175, y + 4.5, { align: 'right' });

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  
  // Row content
  const descText = `${job.title}${job.description ? ' - ' + job.description : ''}`;
  const descLines = doc.splitTextToSize(descText, 95);
  let rowHeight = descLines.length * 5 + 4;
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, y + rowHeight, margin + 180, y + rowHeight);

  // Draw cells
  let tempY = y + 4.5;
  descLines.forEach((line: string) => {
    doc.text(line, margin + 2, tempY);
    tempY += 5;
  });
  
  doc.text("1", margin + 105, y + 4.5, { align: 'center' });
  doc.text(job.price.toFixed(2), margin + 135, y + 4.5, { align: 'right' });
  doc.text(job.price.toFixed(2), margin + 175, y + 4.5, { align: 'right' });

  // Summary section
  y += rowHeight + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  
  doc.text("Subtotal", 130, y);
  doc.text(`INR ${job.price.toFixed(2)}`, 195, y, { align: 'right' });
  
  y += 5;
  doc.text("Tax (GST Included)", 130, y);
  doc.text("INR 0.00", 195, y, { align: 'right' });
  
  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(130, y, 195, y);
  
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text("Total Amount", 130, y);
  doc.text(`INR ${job.price.toFixed(2)}`, 195, y, { align: 'right' });

  // Terms and Conditions
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TERMS & CONDITIONS:", margin, y);
  
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  comp.terms.forEach((term) => {
    doc.text(`- ${term}`, margin, y);
    y += 3.5;
  });

  // Signature Block
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${comp.name}`, margin, y);

  if (stampImg) {
    doc.addImage(stampImg, 'JPEG', margin, y + 2, 14, 14);
  }
  if (sigImg) {
    doc.addImage(sigImg, 'PNG', margin + 16, y + 2, 35, 12);
  }

  y += 18;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 65, y);
  
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorised Signature", margin + 12, y);

  // Footer notes
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(comp.notes, 105, 280, { align: 'center' });

  return doc;
};

export const handleDownloadInvoice = async (job: any) => {
  try {
    const doc = await generateInvoicePDF(job);
    const invNumber = job.visitId || `INV-${job._id?.slice(-6).toUpperCase() || '101'}`;
    const filename = `${job.clientName.replace(/\s+/g, '_')}_invoice_${invNumber}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('Failed to generate and download PDF invoice:', err);
    alert('Failed to generate and download PDF invoice.');
  }
};

export const handleShareInvoice = async (job: any) => {
  try {
    const doc = await generateInvoicePDF(job);
    const invNumber = job.visitId || `INV-${job._id?.slice(-6).toUpperCase() || '101'}`;
    const pdfData = doc.output('blob');
    const filename = `${job.clientName.replace(/\s+/g, '_')}_invoice_${invNumber}.pdf`;
    const file = new File([pdfData], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${job.company} Invoice`,
        text: `Please find attached the invoice for the service.`
      });
    } else {
      // Fallback: download the file
      doc.save(filename);
      alert('PDF direct sharing is not supported on this device/browser. The invoice has been downloaded instead.');
    }
  } catch (err) {
    console.error('Failed to share invoice:', err);
    alert('Failed to share invoice.');
  }
};
