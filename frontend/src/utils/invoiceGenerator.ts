export const handleDownloadInvoice = (job: any) => {
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
        accent: "#7c3aed",
        terms: `Payment due on completion of service.
Re-cleaning offered within 48 hours if unsatisfied.
Prices may vary based on actual condition of items.
GST included in all prices.`,
        notes: "Thank you for choosing SofaShine.",
        signature: window.location.origin + "/logos/sofashine_sig.png"
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
        accent: "#16a34a",
        terms: `Payment due on completion of service.
Re-clean offered within 24 hours if not satisfied.
Prices may vary for luxury / vintage vehicles.
GST included in all prices.`,
        notes: "Thank you for choosing CleanCruisers.",
        signature: window.location.origin + "/logos/cleancruisers_sig.png"
      }
    };

    const comp = companyInfo[job.company as keyof typeof companyInfo] || companyInfo.SofaShine;
    const invNumber = job.visitId || `INV-${job._id?.slice(-6).toUpperCase() || '101'}`;
    const invDate = job.date ? new Date(job.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 0;
            color: #334155;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
          }
          .invoice-box {
            width: 100%;
            max-width: 800px;
            margin: auto;
            padding: 25px;
            box-sizing: border-box;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid ${comp.accent};
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .company-tagline {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .info-text {
            font-size: 11px;
            line-height: 1.5;
            color: #64748b;
          }
          .title-area {
            text-align: right;
          }
          .invoice-title {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 10px 0;
          }
          .meta-item {
            font-size: 12px;
            margin-bottom: 4px;
          }
          .meta-item strong {
            color: #0f172a;
          }
          .bill-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 12px;
          }
          .bill-to {
            max-width: 50%;
          }
          .bill-to-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 6px;
            font-weight: 600;
          }
          .client-name {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .client-details {
            line-height: 1.5;
            color: #475569;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 12px;
          }
          .items-table th {
            background-color: ${comp.accent};
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 10px;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          .items-table tr:last-child td {
            border-bottom: 2px solid ${comp.accent};
          }
          .summary-area {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
          }
          .summary-table {
            width: 250px;
            font-size: 12px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
          }
          .summary-row.total {
            border-top: 1.5px solid #cbd5e1;
            font-weight: 700;
            font-size: 14px;
            color: ${comp.accent};
            padding-top: 10px;
            margin-top: 5px;
          }
          .footer-section {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 10px;
            color: #64748b;
            line-height: 1.6;
          }
          .terms-title {
            font-weight: 600;
            color: #475569;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .notes-msg {
            margin-top: 15px;
            text-align: center;
            font-style: italic;
            color: #475569;
            font-size: 11px;
            font-weight: 500;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header-row">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <img src="${comp.logo}" alt="${comp.name}" style="height: 42px; width: auto; display: block;" />
                <span style="font-size: 24px; font-weight: 700; color: ${comp.accent}; font-family: 'Outfit', sans-serif;">${comp.name}</span>
              </div>
              <div class="company-tagline">${comp.tagline}</div>
              <div class="info-text" style="white-space: pre-line;">${comp.address}</div>
              <div class="info-text" style="margin-top: 6px;">
                <strong>Phone:</strong> ${comp.phone}<br>
                <strong>Email:</strong> ${comp.email}<br>
                <strong>GSTIN:</strong> ${comp.gst}
              </div>
            </div>
            <div class="title-area">
              <h1 class="invoice-title">INVOICE</h1>
              <div class="meta-item"><strong>Invoice No:</strong> ${invNumber}</div>
              <div class="meta-item"><strong>Date:</strong> ${invDate}</div>
              <div class="meta-item"><strong>Due Date:</strong> ${invDate}</div>
            </div>
          </div>

          <div class="bill-row">
            <div class="bill-to">
              <div class="bill-to-title">Billed To:</div>
              <div class="client-name">${job.clientName}</div>
              <div class="client-details">
                <strong>Phone:</strong> ${job.clientPhone}<br>
                <strong>Address:</strong> ${job.address}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="bill-to-title">Payment Mode:</div>
              <div style="font-weight: 600; color: #0f172a; font-size: 12px; margin-top: 4px;">UPI / Cash</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 55%;">Service Description</th>
                <th style="text-align: center; width: 10%;">Qty</th>
                <th style="text-align: right; width: 15%;">Rate (₹)</th>
                <th style="text-align: right; width: 20%;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${job.title}${job.description ? ' - ' + job.description : ''}</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">${job.price.toFixed(2)}</td>
                <td style="text-align: right;">${job.price.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Summary Table -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <div class="summary-table">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>₹${job.price.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span>Tax (GST Included)</span>
                <span>₹0.00</span>
              </div>
              <div class="summary-row total">
                <span>Total Amount</span>
                <span>₹${job.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="footer-section">
            <div class="terms-title">Terms & Conditions:</div>
            <div style="white-space: pre-line; margin-bottom: 25px;">${comp.terms}</div>

            <!-- Signature Block (Below Terms & Conditions) -->
            <div style="display: flex; justify-content: flex-start; margin-bottom: 30px; text-align: left;">
              <div style="font-size: 12px; color: #475569; width: 220px;">
                <div style="margin-bottom: 8px;">For <strong>${comp.name}</strong></div>
                <div style="height: 50px; display: flex; align-items: flex-end; margin-bottom: 4px;">
                  <img src="${comp.signature}" alt="Signature" style="height: 48px; max-width: 180px; object-fit: contain;" />
                </div>
                <div style="border-bottom: 1.5px solid #94a3b8; margin-bottom: 6px; width: 100%;"></div>
                <div style="font-weight: 600; color: #0f172a; font-size: 11px; text-align: center;">
                  Authorised Signature
                </div>
              </div>
            </div>

            <div class="notes-msg">${comp.notes}</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert("Popup blocker prevented opening invoice. Please allow popups for this site.");
    }
  };
