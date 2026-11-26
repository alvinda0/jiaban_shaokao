import { useState, useEffect } from 'react';
import { X, Download, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import * as orderService from '@/services/order.service';
import styles from './SalesReportModal.module.css';

interface SalesReportModalProps {
  isOpen: boolean;
  storeId: string;
  onClose: () => void;
}

interface SalesReport {
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
  discounts?: Array<any>;
  taxes?: Array<any>;
}

export function SalesReportModal({ isOpen, storeId, onClose }: SalesReportModalProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [reportData, setReportData] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Set default dates (today)
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDateFrom(today);
      setDateTo(today);
      setTimeFrom('');
      setTimeTo('');
      setReportData(null);
      setHasSubmitted(false);
    }
  }, [isOpen]);

  const handleFetchReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Tanggal mulai dan akhir harus diisi');
      return;
    }

    // Validate dates
    if (new Date(dateFrom) > new Date(dateTo)) {
      toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
      return;
    }

    try {
      setIsLoading(true);
      setHasSubmitted(true);

      const params: any = {
        date_from: dateFrom,
        date_to: dateTo,
      };

      if (timeFrom) params.time_from = timeFrom;
      if (timeTo) params.time_to = timeTo;

      const response = await orderService.getSalesReport(storeId, params);
      setReportData(response.data);
      toast.success('Laporan berhasil dimuat');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengambil laporan');
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) return;

    try {
      // TODO: Implement PDF export
      toast.success('Fitur export PDF akan segera tersedia');
    } catch (error: any) {
      toast.error('Gagal mengexport laporan');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Laporan Penjualan</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Filter Section */}
          <div className={styles.filterSection}>
            <h3>Filter Laporan</h3>
            
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label>Tanggal Mulai *</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Tanggal Akhir *</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Waktu Mulai (Opsional)</label>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Waktu Akhir (Opsional)</label>
                <input
                  type="time"
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={handleFetchReport}
                disabled={isLoading}
                className={styles.btnFetch}
              >
                {isLoading ? (
                  <>
                    <Loader size={16} className={styles.spinner} />
                    Memuat Laporan...
                  </>
                ) : (
                  'Tampilkan Laporan'
                )}
              </button>
            </div>
          </div>

          {/* Report Section */}
          {hasSubmitted && reportData && (
            <div className={styles.reportSection}>
              <div className={styles.reportHeader}>
                <div>
                  <h3>Hasil Laporan</h3>
                  <p className={styles.period}>
                    {reportData.period.date_from} hingga {reportData.period.date_to}
                    {reportData.period.time_from && ` (${reportData.period.time_from} - ${reportData.period.time_to})`}
                  </p>
                </div>
                <button onClick={handleExportPDF} className={styles.btnExport}>
                  <Download size={16} />
                  Export PDF
                </button>
              </div>

              {/* Summary Cards */}
              <div className={styles.summaryGrid}>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Total Pesanan</div>
                  <div className={styles.cardValue}>{reportData.summary.total_orders}</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardLabel}>Total Penjualan</div>
                  <div className={styles.cardValue}>
                    Rp {Math.round(reportData.summary.total_grand_total || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className={styles.card + ' ' + styles.cardHighlight}>
                  <div className={styles.cardLabel}>Penjualan Netto</div>
                  <div className={styles.cardValue}>
                    Rp {Math.round(reportData.summary.total_grand_total_after_complimentary || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardLabel}>Total Diskon</div>
                  <div className={styles.cardValue}>
                    Rp {Math.round(reportData.summary.total_discount || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardLabel}>Total Pajak</div>
                  <div className={styles.cardValue}>
                    Rp {Math.round(reportData.summary.total_tax || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardLabel}>Service Charge</div>
                  <div className={styles.cardValue}>
                    Rp {Math.round(reportData.summary.total_service_charge || 0).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardLabel}>Complimentary</div>
                  <div className={styles.cardValue}>
                    Rp {Math.round(reportData.summary.total_complimentary || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              {reportData.payment_methods && reportData.payment_methods.length > 0 && (
                <div className={styles.section}>
                  <h4>Metode Pembayaran</h4>
                  <div className={styles.table}>
                    <div className={styles.tableHeader}>
                      <div className={styles.tableCell}>Metode</div>
                      <div className={styles.tableCell}>Jumlah Transaksi</div>
                      <div className={styles.tableCell}>Nominal</div>
                    </div>
                    {reportData.payment_methods.map((method, idx) => (
                      <div key={idx} className={styles.tableRow}>
                        <div className={styles.tableCell}>{method.payment_method}</div>
                        <div className={styles.tableCell}>{method.transaction_count}</div>
                        <div className={styles.tableCell}>
                          Rp {Math.round(method.total_amount || 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products Sold */}
              {reportData.products && reportData.products.length > 0 && (
                <div className={styles.section}>
                  <h4>Produk Terjual</h4>
                  <div className={styles.table}>
                    <div className={styles.tableHeader}>
                      <div className={styles.tableCell}>Produk</div>
                      <div className={styles.tableCell}>Qty</div>
                      <div className={styles.tableCell}>Penjualan</div>
                    </div>
                    {reportData.products.map((item, idx) => (
                      <div key={idx} className={styles.tableRow}>
                        <div className={styles.tableCell}>{item.product_name}</div>
                        <div className={styles.tableCell}>{item.total_qty}</div>
                        <div className={styles.tableCell}>
                          Rp {Math.round(parseFloat(item.subtotal as string || '0')).toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasSubmitted && !reportData && !isLoading && (
            <div className={styles.emptyState}>
              <p>Tidak ada data untuk periode yang dipilih</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
