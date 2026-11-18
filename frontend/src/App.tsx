import { Routes, Route, Navigate } from 'react-router-dom'
import OrderPage from '@/pages/order/OrderPage'
import LoginPage from '@/pages/auth/LoginPage'
import MenuPage from '@/pages/menu/MenuPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import StorePage from '@/pages/store/StorePage'
import UsersPage from '@/pages/users/UsersPage'
import VouchersPage from '@/pages/vouchers/VouchersPage'
import TablesPage from '@/pages/tables/TablesPage'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import TaxesPage from '@/pages/taxes/TaxesPage'
import ProductsPage from '@/pages/products/ProductsPage'
import OrdersPage from '@/pages/Orders'
import ProfilePage from '@/pages/profile/ProfilePage'
import ReportsPage from '@/pages/reports/ReportsPage'
import MainLayout from '@/components/layout/MainLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<OrderPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/menu" element={<MenuPage />} />

      {/* Protected — semua pakai MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/profile"    element={<ProfilePage />} />
          <Route path="/stores"     element={<StorePage />} />
          <Route path="/users"      element={<UsersPage />} />
          <Route path="/vouchers"   element={<VouchersPage />} />
          <Route path="/tables"     element={<TablesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/products"   element={<ProductsPage />} />
          <Route path="/taxes"      element={<TaxesPage />} />
          <Route path="/orders"     element={<OrdersPage />} />
          <Route path="/reports"    element={<ReportsPage />} />
          <Route path="/kitchen"    element={<ComingSoon label="Kitchen" />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#6b7280' }}>
      <span style={{ fontSize: 48 }}>🚧</span>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#d1d5db' }}>{label}</h2>
      <p style={{ fontSize: 14 }}>Halaman ini sedang dalam pengembangan.</p>
    </div>
  )
}

export default App
