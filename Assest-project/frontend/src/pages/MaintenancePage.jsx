import { useMemo, useState, useEffect } from "react";
import AddIcon from "@mui/icons-material/Add";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector, GridToolbarExport, GridToolbarFilterButton } from "@mui/x-data-grid";
import { useLocation } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ px: 1, py: 0.5, gap: 1 }}>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}

const emptyForm = { assetId: "", title: "", description: "", priority: "medium" };

export default function MaintenancePage() {
  const { user } = useAuth();
  const location = useLocation();
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [supplierRows, setSupplierRows] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const dialogFieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "6px", minHeight: 48, fontSize: 14 },
    "& .MuiInputLabel-root": { fontSize: 14 },
  };
  const isSupplierView = new URLSearchParams(location.search).get("view") === "supplier";

  const supplierColumns = useMemo(
    () => [
      { field: "supplier", headerName: "Supplier", flex: 1.3, minWidth: 220 },
      { field: "entries", headerName: "Stock Entries", minWidth: 140 },
      { field: "totalQuantity", headerName: "Total Quantity", minWidth: 150 },
      {
        field: "totalValue",
        headerName: "Total Value",
        minWidth: 140,
        valueFormatter: (value) => {
          const amount = Number(value || 0);
          return `$${amount.toFixed(2)}`;
        },
      },
      {
        field: "lastAddedAt",
        headerName: "Last Added",
        minWidth: 140,
        valueFormatter: (value) => (value ? String(value).slice(0, 10) : "-"),
      },
    ],
    []
  );

  async function loadData() {
    try {
      const [assetsRes, requestsRes] = await Promise.all([
        api.get("/assets", { params: { page: 1, pageSize: 100, sortField: "assetTag", sortDirection: "asc" } }),
        api.get("/maintenance"),
      ]);
      setAssets(assetsRes.data.rows);
      setRequests(requestsRes.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load maintenance data");
    }
  }

  async function loadSupplierData() {
    setSupplierLoading(true);
    try {
      const { data } = await api.get("/assets/stock-logs");
      setSupplierRows(
        (data || []).map((row, index) => ({
          id: index + 1,
          ...row,
        }))
      );
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load supplier data");
    } finally {
      setSupplierLoading(false);
    }
  }

  useEffect(() => {
    if (isSupplierView) {
      loadSupplierData();
      return;
    }
    loadData();
  }, [isSupplierView]);

  async function handleSubmit() {
    if (!form.assetId || !form.title.trim() || !form.description.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      await api.post("/maintenance", {
        assetId: Number(form.assetId),
        title: form.title,
        description: form.description,
        priority: form.priority,
      });
      await loadData();
      setDialogOpen(false);
      setForm(emptyForm);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request");
    }
  }

  async function updateStatus(requestId, status) {
    try {
      await api.patch(`/maintenance/${requestId}`, { status });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  }

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    {
      field: "assetTag",
      headerName: "Asset",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "title",
      headerName: "Title",
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: "priority",
      headerName: "Priority",
      width: 130,
      renderCell: ({ value }) => (
        <Box sx={{ width: "100%", display: "flex", alignItems: "center" }}>
          <Chip
            size="small"
            label={value?.charAt(0).toUpperCase() + value?.slice(1)}
            variant="outlined"
          />
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: ({ value }) => (
        <Box sx={{ width: "100%", display: "flex", alignItems: "center" }}>
          <Chip
            size="small"
            label={value?.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
            variant="outlined"
          />
        </Box>
      ),
    },
    {
      field: "requestedBy",
      headerName: "Requested By",
      flex: 1,
      minWidth: 150,
    },
    ...(user?.role === "admin"
      ? [
          {
            field: "actions",
            headerName: "Actions",
            width: 220,
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
              <Box sx={{ width: "100%", display: "flex", alignItems: "center" }}>
                {row.status !== "resolved" ? (
                  <Stack direction="row" spacing={1}>
                    {row.status !== "in_progress" && (
                      <Button size="small" variant="outlined" onClick={() => updateStatus(row.id, "in_progress")}>
                        In Progress
                      </Button>
                    )}
                    <Button size="small" variant="contained" onClick={() => updateStatus(row.id, "resolved")}>
                      Resolve
                    </Button>
                  </Stack>
                ) : null}
              </Box>
            ),
          },
        ]
      : []),
  ];

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Card
        elevation={0}
        sx={{
          borderRadius: "6px",
          p: { xs: 2, md: 2.5 },
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ width: "100%" }}>
          <Box sx={{ flex: { md: 1 } }}>
            <Typography sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 700, color: "#0f172a", lineHeight: 1.15 }}>
              {isSupplierView ? "Manage Supplier" : "Maintenance"}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 15 }}>
              {isSupplierView
                ? "Review supplier-wise stock additions, quantities, and purchase value trends"
                : "Capture repair issues, escalate service work, and close requests with operational visibility"}
            </Typography>
          </Box>
          <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setForm(emptyForm);
                setError("");
                setDialogOpen(true);
              }}
              sx={{
                bgcolor: "#00695c",
                "&:hover": { bgcolor: "#004d40" },
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: 16,
                textTransform: "none",
                minHeight: 46,
                px: 2.5,
                minWidth: 160,
                alignSelf: { xs: "flex-start", md: "auto" },
                ml: { md: "auto" },
              }}
            >
              Add Request
            </Button>
        </Stack>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Table */}
      <Card elevation={0} sx={{ borderRadius: "6px", border: "1px solid", borderColor: "divider" }}>
        <DataGrid
          rows={isSupplierView ? supplierRows : requests}
          columns={isSupplierView ? supplierColumns : columns}
          loading={isSupplierView ? supplierLoading : false}
          autoHeight
          density="compact"
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{ toolbar: isSupplierView ? undefined : CustomToolbar }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": { bgcolor: "#f0faf9", fontWeight: 700 },
            "& .MuiDataGrid-row:hover": { bgcolor: "#f0faf9" },
            "& .MuiDataGrid-columnHeader": { px: 1.5 },
            "& .MuiDataGrid-cell": { py: 0.75, px: 1.5, display: "flex", alignItems: "center" },
            "& .MuiDataGrid-row": { minHeight: 40 },
          }}
        />
      </Card>

      {/* Add Request Side Panel */}
      <Drawer
        anchor="right"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 0 } }}
      >
        <Stack sx={{ height: "100%" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#f8fafc" }}>
            <Typography sx={{ fontWeight: 700, color: "#0f766e", fontSize: 28, pb: 0.5 }}>
              Add Maintenance Request
            </Typography>
          </Box>

          <Stack spacing={2.25} sx={{ p: 2.5, overflowY: "auto" }}>
            <TextField
              select
              label="Asset"
              size="small"
              value={form.assetId}
              onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}
              fullWidth
              required
              sx={dialogFieldSx}
            >
              <MenuItem value="">Select asset</MenuItem>
              {assets.map((asset) => (
                <MenuItem key={asset.id} value={asset.id}>
                  {asset.assetTag} - {asset.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Issue Title"
              size="small"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              required
              sx={dialogFieldSx}
            />
            <TextField
              label="Description"
              size="small"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={4}
              required
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "6px", fontSize: 14 },
                "& .MuiInputLabel-root": { fontSize: 14 },
              }}
            />
            <TextField
              select
              label="Priority"
              size="small"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              fullWidth
              sx={dialogFieldSx}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: "auto", px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" color="inherit" sx={{ textTransform: "none", borderRadius: "6px", minHeight: 40, minWidth: 100, fontWeight: 600 }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" }, textTransform: "none", borderRadius: "6px", minHeight: 40, minWidth: 150, fontWeight: 700 }}>
              Submit Request
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </Stack>
  );
}
