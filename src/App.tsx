
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/layout/Layout";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ListingPage from "./pages/ListingPage";
import CreateListingPage from "./pages/CreateListingPage";
import MessagesPage from "./pages/MessagesPage";
import LostFoundPage from "./pages/LostFoundPage";
import LostFoundDetailsPage from "./pages/LostFoundDetailsPage";
import CreateLostFoundPage from "./pages/CreateLostFoundPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

// Admin Components
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { DashboardPanel } from "./components/admin/DashboardPanel";
import { ListingsTable } from "./components/admin/ListingsTable";
import { UsersTable } from "./components/admin/UsersTable";
import { SettingsPanel } from "./components/admin/SettingsPanel";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/listing/:id" element={<ListingPage />} />
              <Route path="/create-listing" element={<CreateListingPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/lost-found" element={<LostFoundPage />} />
              <Route path="/lost-found/:id" element={<LostFoundDetailsPage />} />
              <Route path="/lost-found/create" element={<CreateLostFoundPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            
            {/* Admin Routes */}
            <Route element={<AdminProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<DashboardPanel />} />
                <Route path="/admin/listings" element={<ListingsTable />} />
                <Route path="/admin/users" element={<UsersTable />} />
                <Route path="/admin/settings" element={<SettingsPanel />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
