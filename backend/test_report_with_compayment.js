require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const token = process.env.TEST_TOKEN || 'your-jwt-token-here';

async function testProfitLossReport() {
  try {
    console.log('🧪 Testing Profit Loss Report with Compayment...\n');
    
    // Get first store
    const storesRes = await axios.get(`${API_BASE_URL}/stores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (storesRes.data.data.length === 0) {
      console.log('❌ No stores found');
      return;
    }
    
    const storeId = storesRes.data.data[0].store_id;
    console.log(`✅ Using Store ID: ${storeId}\n`);
    
    // Get date range
    const today = new Date();
    const dateFrom = '2024-01-01';
    const dateTo = today.toISOString().split('T')[0];
    
    console.log(`📅 Date Range: ${dateFrom} to ${dateTo}\n`);
    
    // Test Profit Loss Report
    const reportUrl = `${API_BASE_URL}/stores/${storeId}/reports/profit-loss?date_from=${dateFrom}&date_to=${dateTo}`;
    
    console.log(`📡 Fetching: ${reportUrl}\n`);
    
    const reportRes = await axios.get(reportUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!reportRes.data.success) {
      console.log('❌ API Error:', reportRes.data.message);
      return;
    }
    
    const report = reportRes.data.data;
    
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 LAPORAN LABA/RUGI');
    console.log('═══════════════════════════════════════════════════\n');
    
    // A. PENDAPATAN
    console.log('📈 A. PENDAPATAN:');
    console.log(`   Total Penjualan: Rp ${Number(report.A_pendapatan.total_subtotal).toLocaleString('id-ID')}`);
    console.log(`   Diskon: Rp ${Number(report.A_pendapatan.total_discount).toLocaleString('id-ID')}`);
    console.log(`   ✨ Kompayment (Item Gratis): Rp ${Number(report.A_pendapatan.complimentary_items).toLocaleString('id-ID')}`);
    console.log(`   ✨ Kompayment (Pesanan Gratis): Rp ${Number(report.A_pendapatan.complimentary_orders).toLocaleString('id-ID')}`);
    console.log(`   Biaya Layanan: Rp ${Number(report.A_pendapatan.total_service_charge).toLocaleString('id-ID')}`);
    console.log(`   Pajak: Rp ${Number(report.A_pendapatan.total_tax).toLocaleString('id-ID')}`);
    console.log(`   Total Pendapatan: Rp ${Number(report.A_pendapatan.total_revenue).toLocaleString('id-ID')}\n`);
    
    // B. COGS
    console.log('📦 B. HARGA POKOK PENJUALAN:');
    console.log(`   Total Item: ${report.B_harga_pokok_penjualan.total_items_sold}`);
    console.log(`   Total PPH: Rp ${Number(report.B_harga_pokok_penjualan.total_cogs).toLocaleString('id-ID')}\n`);
    
    // C. LABA KOTOR
    console.log('💹 C. LABA KOTOR:');
    console.log(`   Laba Kotor: Rp ${Number(report.C_laba_kotor.laba_kotor).toLocaleString('id-ID')}`);
    console.log(`   Margin: ${report.C_laba_kotor.margin_percentage}%\n`);
    
    // D. PENGELUARAN
    console.log('💸 D. PENGELUARAN:');
    console.log(`   Diskon Diberikan: Rp ${Number(report.D_pengeluaran.discount_given).toLocaleString('id-ID')}`);
    console.log(`   ✨ Kompayment (Item Gratis): Rp ${Number(report.D_pengeluaran.complimentary_items).toLocaleString('id-ID')}`);
    console.log(`   ✨ Kompayment (Pesanan Gratis): Rp ${Number(report.D_pengeluaran.complimentary_orders).toLocaleString('id-ID')}`);
    console.log(`   Total Pengeluaran: Rp ${Number(report.D_pengeluaran.total_expenses).toLocaleString('id-ID')}\n`);
    
    // E. LABA BERSIH
    console.log('✅ E. LABA/RUGI BERSIH:');
    console.log(`   Laba Bersih: Rp ${Number(report.E_laba_rugi_bersih.laba_rugi_bersih).toLocaleString('id-ID')}`);
    console.log(`   Margin: ${report.E_laba_rugi_bersih.margin_percentage}%\n`);
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Test BERHASIL! Kompayment sudah ditambahkan ke laporan.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testProfitLossReport();
