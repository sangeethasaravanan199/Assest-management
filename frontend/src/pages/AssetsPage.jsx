import { useEffect, useState } from "react";
import { Alert, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import AssetList from "../components/AssetList";
import { useAuth } from "../auth/AuthContext";
import { addAssetStock } from "../services/assetStockService";

export default function AssetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 100 });
  const [sortModel, setSortModel] = useState([{ field: "id", sort: "desc" }]);
  const [filters, setFilters] = useState({ search: "", status: "", type: "" });
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    available: 0,
    reserved: 0,
    assigned: 0,
    in_use: 0,
    under_maintenance: 0,
    lost: 0,
    retired: 0,
    low_stock: 0,
  });

  async function loadStatusSummary() {
    try {
      const { data } = await api.get("/assets/summary");
      setStatusSummary({
        total: Number(data.total || 0),
        available: Number(data.available || 0),
        reserved: Number(data.reserved || 0),
        assigned: Number(data.assigned || 0),
        in_use: Number(data.in_use || 0),
        under_maintenance: Number(data.under_maintenance || 0),
        lost: Number(data.lost || 0),
        retired: Number(data.retired || 0),
        low_stock: Number(data.low_stock || 0),
      });
    } catch {
      setStatusSummary((prev) => prev);
    }
  }

  async function loadAssets() {
    setLoading(true);
    try {
      const selectedSortField = sortModel[0]?.field;
      const apiSortField = selectedSortField === "serialNumber" ? "id" : selectedSortField;

      const { data } = await api.get("/assets", {
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          sortField: apiSortField || "id",
          sortDirection: sortModel[0]?.sort || "desc",
          search: filters.search,
          status: filters.status,
          type: filters.type,
        },
      });
      setAssets(data.rows);
      setRowCount(data.total);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [paginationModel, sortModel, filters]);

  useEffect(() => {
    loadStatusSummary();
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;

    api
      .get("/users/employees")
      .then(({ data }) => setEmployees(data))
      .catch(() => setEmployees([]));
  }, [user?.role]);

  async function handleReturn(assetId) {
    try {
      await api.post(`/assets/${assetId}/return`);
      await Promise.all([loadAssets(), loadStatusSummary()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to return asset");
    }
  }

  async function handleRetire(assetId) {
    try {
      await api.post(`/assets/${assetId}/retire`);
      await Promise.all([loadAssets(), loadStatusSummary()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to retire asset");
    }
  }

  async function handleCreate(payload) {
    try {
      await api.post("/assets", payload);
      await Promise.all([loadAssets(), loadStatusSummary()]);
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create asset";
      setError(message);
      return { ok: false, message };
    }
  }

  async function handleBulkUpload(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post("/assets/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await Promise.all([loadAssets(), loadStatusSummary()]);
      return { ok: true, ...data };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to bulk upload assets";
      setError(message);
      return { ok: false, message };
    }
  }

  async function handleDownloadBulkTemplate(format = "csv") {
    try {
      const { data } = await api.get("/assets/bulk-template", {
        params: { format },
        responseType: "blob",
      });

      const extension = format === "xlsx" ? "xlsx" : "csv";
      const mimeType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv;charset=utf-8;";
      const blob = new Blob([data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `asset-bulk-upload-template.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download bulk upload template");
    }
  }

  async function handleUpdate(assetId, payload) {
    try {
      await api.put(`/assets/${assetId}`, payload);
      await Promise.all([loadAssets(), loadStatusSummary()]);
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to update asset";
      setError(message);
      return { ok: false, message };
    }
  }

  async function handleDelete(assetId) {
    try {
      await api.delete(`/assets/${assetId}`);
      await Promise.all([loadAssets(), loadStatusSummary()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete asset");
    }
  }

  async function handleRequestMaintenance(payload) {
    try {
      await api.post("/maintenance", payload);
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to submit maintenance request";
      return { ok: false, message };
    }
  }

  async function handleAddStock(payload) {
    try {
      await addAssetStock(api, payload);
      await Promise.all([loadAssets(), loadStatusSummary()]);
      return { ok: true };
    } catch (err) {
      const issues = Array.isArray(err.response?.data?.errors) ? err.response.data.errors : [];
      const firstIssue = issues[0]?.message;
      const message = firstIssue
        ? `${err.response?.data?.message || "Failed to add stock"}: ${firstIssue}`
        : (err.response?.data?.message || "Failed to add stock");
      setError(message);
      return { ok: false, message, details: issues };
    }
  }

  async function handleAssign(payload) {
    try {
      await api.post(`/assets/${payload.assetId}/assign`, {
        employeeId: payload.employeeId,
        expectedReturnDate: payload.expectedReturnDate,
        notes: payload.notes,
      });
      await Promise.all([loadAssets(), loadStatusSummary()]);
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to assign asset";
      setError(message);
      return { ok: false, message };
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <AssetList
        rows={assets}
        employees={employees}
        rowCount={rowCount}
        loading={loading}
        error={error}
        onCreate={handleCreate}
        onBulkUpload={handleBulkUpload}
        onDownloadBulkTemplate={handleDownloadBulkTemplate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAssign={handleAssign}
        onReturn={handleReturn}
        onRetire={handleRetire}
        onRequestMaintenance={handleRequestMaintenance}
        onAddStock={handleAddStock}
        isAdmin={user?.role === "admin"}
        userRole={user?.role || ""}
        statusSummary={statusSummary}
        onAddClick={() => navigate("/assets/add")}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filters={filters}
        onFiltersChange={(next) => {
          setPaginationModel((prev) => ({ ...prev, page: 0 }));
          setFilters(next);
        }}
      />
    </Stack>
  );
}
