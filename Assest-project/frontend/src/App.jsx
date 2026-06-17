import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { ProtectedRoute, RoleRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AssetDetailsPage from "./pages/AssetDetailsPage";
import AddAssetPage from "./pages/AddAssetPage";
import AssetsPage from "./pages/AssetsPage";
import AssetSubCategoriesPage from "./pages/AssetSubCategoriesPage";
import AssetHistoryPage from "./pages/AssetHistoryPage";
import AssetHistoryDetailsPage from "./pages/AssetHistoryDetailsPage";
import AssetStatusPage from "./pages/AssetStatusPage";
import AddStockPage from "./pages/AddStockPage";
import MaintenancePage from "./pages/MaintenancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import DepartmentPage from "./pages/DepartmentPage";
import SubDepartmentPage from "./pages/SubDepartmentPage";
import ManageWebsitePage from "./pages/ManageWebsitePage";
import AuditPage from "./pages/AuditPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/add-stock" element={<AddStockPage />} />
          <Route element={<RoleRoute roles={["admin"]} />}>
            <Route path="/assets/add" element={<AddAssetPage />} />
          </Route>
          <Route path="/assets/sub-categories" element={<AssetSubCategoriesPage />} />
          <Route path="/assets/history" element={<AssetHistoryPage />} />
          <Route path="/assets/history/:id" element={<AssetHistoryDetailsPage />} />
          <Route path="/assets/:id" element={<AssetDetailsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route element={<RoleRoute roles={["admin", "auditor", "it"]} />}>
            <Route path="/audit" element={<AuditPage />} />
          </Route>
          <Route path="/manage-website" element={<ManageWebsitePage />} />
          <Route element={<RoleRoute roles={["admin"]} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/departments" element={<DepartmentPage />} />
            <Route path="/admin/sub-departments" element={<SubDepartmentPage />} />
            <Route path="/assets/status" element={<AssetStatusPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
