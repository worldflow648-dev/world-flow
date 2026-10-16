import React, { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { OnboardingSlides } from "@/components/OnboardingSlides";
import { MerchantOnboarding } from "@/components/MerchantOnboarding";
import RoleSwitcher from "@/components/RoleSwitcher";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Search from "./pages/Search";
import Orders from "./pages/Orders";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantInvoices from "./pages/MerchantInvoices";
import OrderDetail from "./pages/OrderDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AboutApp from "./pages/AboutApp";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminMerchants from "./pages/admin/AdminMerchants";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminAddons from "./pages/admin/AdminAddons";
import AdminActivationKeys from "./pages/admin/AdminActivationKeys";
 import AdminDiscounts from "./pages/admin/AdminDiscounts";
 import AdminAccounting from "./pages/admin/AdminAccounting";
 import AdminExpenses from "./pages/admin/AdminExpenses";
 import AdminSupport from "./pages/admin/AdminSupport";
 import AdminBanners from "./pages/admin/AdminBanners";
 import AdminGovernorates from "./pages/admin/AdminGovernorates";
  import AdminReturns from "./pages/admin/AdminReturns";
  import AdminIssues from "./pages/admin/AdminIssues";
 import AdminContentPages from "./pages/admin/AdminContentPages";
 import AdminTierDiscounts from "./pages/admin/AdminTierDiscounts";
  import AdminGraphs from "./pages/admin/AdminGraphs";
import AdminAttendance from "./pages/admin/AdminAttendance";

// Staff Pages
import StaffLayout from "./pages/staff/StaffLayout";
import StaffJobQueue from "./pages/staff/StaffJobQueue";
import StaffProcessOrder from "./pages/staff/StaffProcessOrder";
import StaffProfile from "./pages/staff/StaffProfile";
import StaffAdditions from "./pages/staff/StaffAdditions";
import StaffAttendance from "./pages/staff/StaffAttendance";

const queryClient = new QueryClient();

// Gate component that shows merchant onboarding if profile not completed
function MerchantOnboardingGate({ children }: { children: React.ReactNode }) {
  const { profile, role, isAuthenticated, isLoading, refreshProfile } = useAuth();

  if (isLoading || !isAuthenticated) return <>{children}</>;
  if (role === 'merchant' && profile && profile.profile_completed === false) {
    return <MerchantOnboarding onComplete={refreshProfile} />;
  }
  return <>{children}</>;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    return !localStorage.getItem('splash_seen');
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('onboarding_seen');
  });

  const handleSplashFinish = useCallback(() => {
    localStorage.setItem('splash_seen', 'true');
    setShowSplash(false);
  }, []);

  const handleOnboardingFinish = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
        <CartProvider>
             <TooltipProvider>
              <BrowserRouter>
                <NotificationProvider>
                  <MerchantOnboardingGate>
                  {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
                  {!showSplash && showOnboarding && <OnboardingSlides onFinish={handleOnboardingFinish} />}
                  <Toaster />
                  <Sonner />
                  <RoleSwitcher />
                  <Routes>
                {/* Public Route */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Merchant Routes (authenticated) */}
                <Route path="/" element={<Index />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <Cart />
                  </ProtectedRoute>
                } />
                <Route path="/checkout" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <Checkout />
                  </ProtectedRoute>
                } />
                <Route path="/order-success/:orderId" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <OrderSuccess />
                  </ProtectedRoute>
                } />
                <Route path="/search" element={<Search />} />
                <Route path="/orders" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <Orders />
                  </ProtectedRoute>
                } />
                <Route path="/order/:orderId" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <OrderDetail />
                  </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <MerchantInvoices />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <MerchantDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                    <Notifications />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/help" element={
                  <ProtectedRoute>
                    <Help />
                  </ProtectedRoute>
                } />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/about" element={<AboutApp />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="returns" element={<AdminReturns />} />
                  <Route path="issues" element={<AdminIssues />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="addons" element={<AdminAddons />} />
                   <Route path="discounts" element={<AdminDiscounts />} />
                   <Route path="tier-discounts" element={<AdminTierDiscounts />} />
                  <Route path="merchants" element={<AdminMerchants />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="activation-keys" element={<AdminActivationKeys />} />
                   <Route path="accounting" element={<AdminAccounting />} />
                   <Route path="expenses" element={<AdminExpenses />} />
                    <Route path="support" element={<AdminSupport />} />
                    <Route path="banners" element={<AdminBanners />} />
                    <Route path="governorates" element={<AdminGovernorates />} />
                     <Route path="content" element={<AdminContentPages />} />
                     <Route path="graphs" element={<AdminGraphs />} />
                     <Route path="attendance" element={<AdminAttendance />} />
                </Route>

                {/* Staff/Production Routes */}
                <Route path="/staff" element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <StaffLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<StaffJobQueue />} />
                  <Route path="additions" element={<StaffAdditions />} />
                  <Route path="attendance" element={<StaffAttendance />} />
                  <Route path="order/:id" element={<StaffProcessOrder />} />
                </Route>
                
                {/* Staff Profile (outside layout to have its own header) */}
                <Route path="/staff/profile" element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <StaffProfile />
                  </ProtectedRoute>
                } />
                
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </MerchantOnboardingGate>
                </NotificationProvider>
              </BrowserRouter>
            </TooltipProvider>
        </CartProvider>
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
