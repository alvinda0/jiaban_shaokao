import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SalesReportData {
  period: {
    date_from: string;
    date_to: string;
    time_from?: string;
    time_to?: string;
  };
  summary: {
    total_orders: number;
    total_subtotal: number;
    total_discount: number;
    total_service_charge: number;
    total_tax: number;
    total_rounding: number;
    total_grand_total: number;
    total_grand_total_after_complimentary: number;
    avg_order_value: number;
    total_complimentary: number;
  };
  payment_methods: Array<{
    payment_method: string;
    payment_type: string;
    transaction_count: number;
    total_amount: number;
  }>;
  products?: Array<{
    product_id: string;
    product_name: string;
    total_qty: number;
    unit_price: string;
    subtotal: string;
    item_discount: string;
  }>;
}

export async function generateSalesReportPDF(data: SalesReportData, fileName: string = 'sales-report.pdf') {
  const element = document.createElement('div');
  element.style.position = 'absolute';
  element.style.left = '-10000px';
  element.style.width = '1000px';
  element.style.padding = '20px';
  element.style.backgroundColor = '#fff';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.fontSize = '12px';
  element.style.lineHeight = '1.5';
  
  // Header
  const header = `
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">LAPORAN PENJUALAN</h1>
      <p style="margin: 5px 0; font-size: 11px; color: #666;">
        ${formatDate(data.period.date_from)} hingga ${formatDate(data.period.date_to)}
        ${data.period.time_from ? ` (${data.period.time_from} - ${data.period.time_to})` : ''}
      </p>
    </div>
  `;

  // Summary Section
  const summary = `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">RINGKASAN PENJUALAN</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Pesanan</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${data.summary.total_orders}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Penjualan</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(data.summary.total_grand_total)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Penjualan Netto</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(data.summary.total_grand_total_after_complimentary)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Diskon</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(data.summary.total_discount)}</td>
        </tr>
        <tr style="background: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Pajak</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(data.summary.total_tax)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Service Charge</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(data.summary.total_service_charge)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Complimentary</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(data.summary.total_complimentary)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Rata-rata Pesanan</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(data.summary.avg_order_value)}</td>
        </tr>
      </table>
    </div>
  `;

  // Payment Methods
  let paymentMethodsHtml = '';
  if (data.payment_methods && data.payment_methods.length > 0) {
    paymentMethodsHtml = `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">METODE PEMBAYARAN</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Metode</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Jumlah Transaksi</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Nominal</th>
            </tr>
          </thead>
          <tbody>
            ${data.payment_methods
              .map(
                (method) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${method.payment_method}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${method.transaction_count}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(method.total_amount)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Products
  let productsHtml = '';
  if (data.products && data.products.length > 0) {
    productsHtml = `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">PRODUK TERJUAL</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Produk</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Penjualan</th>
            </tr>
          </thead>
          <tbody>
            ${data.products
              .map(
                (item) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.product_name}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.total_qty}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatCurrency(parseFloat(item.subtotal))}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  element.innerHTML = header + summary + paymentMethodsHtml + productsHtml;
  document.body.appendChild(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#fff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width
    const pageHeight = 297; // A4 height
    let heightLeft = canvas.height * imgWidth / canvas.width;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - canvas.height * imgWidth / canvas.width;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(element);
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('id-ID');
}
