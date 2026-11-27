import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  id: {
    translation: {
      // Welcome
      welcome: 'Selamat Datang',
      scanQR: 'Scan QR Code di meja Anda untuk mulai memesan',
      
      // Header
      table: 'Meja',
      
      // Category
      all: 'Semua',
      
      // Loading & Empty
      loadingMenu: 'Memuat menu...',
      noMenu: 'Belum ada menu tersedia',
      
      // Cart
      cart: 'Keranjang',
      emptyCart: 'Keranjang kosong',
      addToCart: 'Pesan',
      addedToCart: 'ditambah ke keranjang',
      removedFromCart: 'Item dihapus dari keranjang',
      
      // Variant Modal
      basePrice: 'Harga Dasar',
      quantity: 'Jumlah',
      selectQuantity: 'Pilih Jumlah',
      notesOptional: 'Catatan (Opsional)',
      notesPlaceholder: 'Contoh: Tidak pedas, tanpa bawang...',
      total: 'Total',
      
      // Order
      subtotal: 'Subtotal',
      discount: 'Diskon',
      grandTotal: 'Total',
      orderType: 'Tipe Pesanan',
      dineIn: 'Makan di Tempat',
      takeAway: 'Bawa Pulang',
      customerInfo: 'Info Pelanggan',
      optional: 'Opsional',
      customerName: 'Nama Pelanggan',
      customerPhone: 'No. WhatsApp',
      promoCode: 'Kode Promo',
      enterPromoCode: 'Masukkan kode promo',
      apply: 'Gunakan',
      checking: 'Memeriksa...',
      voucherApplied: 'Promo berhasil digunakan!',
      voucherRemoved: 'Promo dihapus',
      invalidVoucher: 'Kode promo tidak valid',
      enterVoucherCode: 'Masukkan kode promo',
      orderItems: 'Daftar Pesanan',
      createOrder: 'Buat Pesanan',
      addItems: 'Tambah Item',
      continueOrder: 'Lanjutkan Pesan',
      items: 'item',
      orderSuccess: 'Pesanan Berhasil!',
      orderSuccessMsg: 'Pesanan berhasil dipesan!\n\nPesanan Anda akan diproses oleh kasir.\nMohon tunggu...',
      orderFailed: 'Gagal membuat pesanan',
      tableNotFound: 'Table ID tidak ditemukan',
      
      // Order History
      activeOrder: 'Pesanan Aktif',
      newOrder: 'Pesanan Baru',
      startNewOrderConfirm: 'Mulai pesanan baru? Pesanan saat ini akan tetap aktif.',
      newOrderStarted: 'Pesanan baru dimulai',
      itemsAdded: 'Item ditambahkan ke pesanan!',
      autoApplied: 'Otomatis digunakan',
      
      // Actions
      close: 'Tutup',
      cancel: 'Batal',
      confirm: 'Konfirmasi',
    }
  },
  en: {
    translation: {
      // Welcome
      welcome: 'Welcome',
      scanQR: 'Scan the QR Code on your table to start ordering',
      
      // Header
      table: 'Table',
      
      // Category
      all: 'All',
      
      // Loading & Empty
      loadingMenu: 'Loading menu...',
      noMenu: 'No menu available',
      
      // Cart
      cart: 'Cart',
      emptyCart: 'Cart is empty',
      addToCart: 'Order',
      addedToCart: 'added to cart',
      removedFromCart: 'Item removed from cart',
      
      // Variant Modal
      basePrice: 'Base Price',
      quantity: 'Quantity',
      selectQuantity: 'Select Quantity',
      notesOptional: 'Notes (Optional)',
      notesPlaceholder: 'Example: No spicy, no onion...',
      total: 'Total',
      
      // Order
      subtotal: 'Subtotal',
      discount: 'Discount',
      grandTotal: 'Grand Total',
      orderType: 'Order Type',
      dineIn: 'Dine In',
      takeAway: 'Take Away',
      customerInfo: 'Customer Info',
      optional: 'Optional',
      customerName: 'Customer Name',
      customerPhone: 'WhatsApp Number',
      promoCode: 'Promo Code',
      enterPromoCode: 'Enter promo code',
      apply: 'Apply',
      checking: 'Checking...',
      voucherApplied: 'Promo applied successfully!',
      voucherRemoved: 'Promo removed',
      invalidVoucher: 'Invalid promo code',
      enterVoucherCode: 'Enter promo code',
      orderItems: 'Order Items',
      createOrder: 'Create Order',
      addItems: 'Add Items',
      continueOrder: 'Continue Order',
      items: 'items',
      orderSuccess: 'Order Successfully!',
      orderSuccessMsg: 'Order placed successfully!\n\nYour order will be processed by the cashier.\nPlease wait...',
      orderFailed: 'Failed to create order',
      tableNotFound: 'Table ID not found',
      
      // Order History
      activeOrder: 'Active Order',
      newOrder: 'New Order',
      startNewOrderConfirm: 'Start a new order? Current order will remain active.',
      newOrderStarted: 'New order started',
      itemsAdded: 'Items added to order!',
      autoApplied: 'Auto-applied',
      
      // Actions
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
    }
  },
  zh: {
    translation: {
      // Welcome
      welcome: '歡迎光臨',
      scanQR: '掃描桌上的二維碼開始點餐',
      
      // Header
      table: '桌號',
      
      // Category
      all: '全部',
      
      // Loading & Empty
      loadingMenu: '載入菜單中...',
      noMenu: '暫無菜單',
      
      // Cart
      cart: '購物車',
      emptyCart: '購物車是空的',
      addToCart: '點餐',
      addedToCart: '已加入購物車',
      removedFromCart: '項目已從購物車移除',
      
      // Variant Modal
      basePrice: '基本價格',
      quantity: '數量',
      selectQuantity: '選擇數量',
      notesOptional: '備註（選填）',
      notesPlaceholder: '例如：不要辣、不要洋蔥...',
      total: '總計',
      
      // Order
      subtotal: '小計',
      discount: '折扣',
      grandTotal: '總計',
      orderType: '訂單類型',
      dineIn: '內用',
      takeAway: '外帶',
      customerInfo: '客戶資訊',
      optional: '選填',
      customerName: '客戶姓名',
      customerPhone: 'WhatsApp號碼',
      promoCode: '優惠碼',
      enterPromoCode: '輸入優惠碼',
      apply: '使用',
      checking: '檢查中...',
      voucherApplied: '優惠碼已成功使用！',
      voucherRemoved: '優惠碼已移除',
      invalidVoucher: '無效的優惠碼',
      enterVoucherCode: '請輸入優惠碼',
      orderItems: '訂單項目',
      createOrder: '創建訂單',
      addItems: '添加項目',
      continueOrder: '繼續訂購',
      items: '項',
      orderSuccess: '訂單提交成功！',
      orderSuccessMsg: '訂單提交成功！\n\n您的訂單將由收銀員處理。\n請稍候...',
      orderFailed: '創建訂單失敗',
      tableNotFound: '找不到桌號',
      
      // Order History
      activeOrder: '當前訂單',
      newOrder: '新訂單',
      startNewOrderConfirm: '開始新訂單？當前訂單將保持活躍。',
      newOrderStarted: '新訂單已開始',
      itemsAdded: '項目已添加到訂單！',
      autoApplied: '自動應用',
      
      // Actions
      close: '關閉',
      cancel: '取消',
      confirm: '確認',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'id', // default language
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
