import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import KeyboardDoubleArrowDownOutlinedIcon from "@mui/icons-material/KeyboardDoubleArrowDownOutlined";
import KeyboardReturnOutlinedIcon from "@mui/icons-material/KeyboardReturnOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PlaylistAddCheckCircleOutlinedIcon from "@mui/icons-material/PlaylistAddCheckCircleOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import RoomPreferencesOutlinedIcon from "@mui/icons-material/RoomPreferencesOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { addAssetStock } from "../services/assetStockService";
import { DataGrid } from "@mui/x-data-grid";

const defaultForm = {
  name: "",
  type: "laptop",
  quantity: 1,
  location: "",
  purchaseDate: "",
  warrantyExpiry: "",
  unitCost: "",
  remarks: "",
  source: "purchase",
  serialNumbersText: "",
};

const typeOptions = ["laptop", "desktop", "monitor", "printer", "network_device"];
const sourceOptions = ["purchase", "return", "adjustment"];

const sectionConfig = [
  {
    key: "stockIn",
    label: "Total Stock",
    icon: <KeyboardDoubleArrowDownOutlinedIcon fontSize="small" />,
    emptyTitle: "No stock records found",
    emptyMessage: "All asset records will appear here once stock is available.",
    columnsText: "Asset Tag, Asset Name, Category, Location, Purchase Date, Status",
    actionsText: "View Details",
  },
  {
    key: "available",
    label: "Available Stock",
    icon: <Inventory2OutlinedIcon fontSize="small" />,
    emptyTitle: "No available stock",
    emptyMessage: "Assets marked available will appear here.",
    columnsText: "Asset Tag, Asset Name, Category, Location, Purchase Date, Warranty End, Health",
    actionsText: "View Details, Reserve",
  },
  {
    key: "reserved",
    label: "Reserved Stock",
    icon: <RoomPreferencesOutlinedIcon fontSize="small" />,
    emptyTitle: "No reserved stock",
    emptyMessage: "Assets marked as reserved will appear here.",
    columnsText: "Asset Tag, Asset Name, Reserved For, Location, Reserve Date, Expected Return, Status",
    actionsText: "View Details, Release",
  },
  {
    key: "assigned",
    label: "Assigned Stock",
    icon: <PlaylistAddCheckCircleOutlinedIcon fontSize="small" />,
    emptyTitle: "No assigned stock",
    emptyMessage: "Assets currently assigned to employees will appear here.",
    columnsText: "Asset Tag, Asset Name, Assigned To, Department, Assigned Date, Expected Return, Status",
    actionsText: "View Details, Return",
  },
  {
    key: "repair",
    label: "In Repair",
    icon: <BuildCircleOutlinedIcon fontSize="small" />,
    emptyTitle: "No assets in repair",
    emptyMessage: "Assets under maintenance will appear here.",
    columnsText: "Asset Tag, Asset Name, Issue, Started On, Vendor, SLA Due, Status",
    actionsText: "View Details, Mark Fixed",
  },
  {
    key: "returned",
    label: "Returned Stock",
    icon: <KeyboardReturnOutlinedIcon fontSize="small" />,
    emptyTitle: "No returned stock",
    emptyMessage: "Returned assets will be listed here once tagged as return.",
    columnsText: "Asset Tag, Asset Name, Returned From, Return Date, Condition, Location, Status",
    actionsText: "View Details, Re-qualify",
  },
];

function normalizeStatus(statusValue) {
  const value = String(statusValue || "").toLowerCase();
  if (value === "in_use") return "assigned";
  if (["maintenance", "under_maintenance", "in_repair"].includes(value)) return "repair";
  return value || "available";
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinDays(value, days = 30) {
  const date = parseDate(value);
  if (!date) return false;
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= days;
}

function healthLabel(row) {
  const warranty = parseDate(row.warrantyExpiry);
  if (!warranty) return "Unknown";
  const now = new Date();
  const daysLeft = Math.ceil((warranty.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return "Expired";
  if (daysLeft <= 45) return "Expiring Soon";
  return "Healthy";
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(rows, fileName) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","));
  const csv = [headers.map((h) => csvEscape(h)).join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildLowStockRows(availableRows) {
  const grouped = new Map();
  availableRows.forEach((row) => {
    const key = `${String(row.name || "").trim().toLowerCase()}|${String(row.type || "").trim().toLowerCase()}`;
    const current = grouped.get(key) || {
      id: `low-${key}`,
      name: row.name || "Unknown Model",
      type: row.type || "-",
      availableQty: 0,
      threshold: 3,
      suggestedReorder: 6,
      locations: new Set(),
      sampleAssetTags: [],
      lastReceivedDate: row.createdDate || row.purchaseDate || "",
    };
    current.availableQty += 1;
    if (row.location) current.locations.add(row.location);
    if (row.assetTag && current.sampleAssetTags.length < 5) current.sampleAssetTags.push(row.assetTag);
    if (String(row.createdDate || row.purchaseDate || "") > String(current.lastReceivedDate || "")) {
      current.lastReceivedDate = row.createdDate || row.purchaseDate || "";
    }
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .filter((row) => row.availableQty <= row.threshold)
    .map((row) => ({
      ...row,
      locations: [...row.locations],
      priority: row.availableQty === 0 ? "Critical" : row.availableQty <= 1 ? "High" : "Medium",
    }))
    .sort((a, b) => a.availableQty - b.availableQty);
}

export default function AddStockPage() {
  const { user } = useAuth();
  const bulkInputRef = useRef(null);
  const [form, setForm] = useState(defaultForm);
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState({ total: 0, available: 0, reserved: 0, assigned: 0, repair: 0, retired: 0, lowStock: 0 });
  const [tab, setTab] = useState("available");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusActionBusy, setStatusActionBusy] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageStock = user?.role === "admin" || user?.role === "it";

  const fieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "6px", fontSize: 14 },
    "& .MuiInputLabel-root": { fontSize: 14 },
  };

  function pickBestAssignment(assignments, assetId) {
    const list = Array.isArray(assignments) ? assignments : [];
    let latest = null;
    let active = null;

    for (let i = 0; i < list.length; i += 1) {
      const assignment = list[i];
      if (Number(assignment?.assetId) !== Number(assetId)) continue;

      if (!latest) latest = assignment;
      if (!assignment?.returnedAt && !active) active = assignment;

      if (latest && active) break;
    }

    return active || latest || null;
  }

  async function refreshAssignmentDetail(assetId) {
    if (!assetId) {
      setAssignmentDetail(null);
      return;
    }

    setLoadingAssignment(true);
    try {
      const { data: assignments } = await api.get("/assets/assignments");
      const bestAssignment = pickBestAssignment(assignments, assetId);
      setAssignmentDetail(bestAssignment);
    } catch (err) {
      console.error("Failed to fetch assignment detail", err);
      setAssignmentDetail(null);
    } finally {
      setLoadingAssignment(false);
    }
  }

  async function loadStockWorkspace() {
    setLoading(true);
    setError("");
    try {
      const pageSize = 100;
      const rows = [];
      let currentPage = 1;
      let totalCount = 0;

      do {
        const { data } = await api.get("/assets", {
          params: {
            page: currentPage,
            pageSize,
            sortField: "id",
            sortDirection: "desc",
          },
        });

        const chunk = Array.isArray(data?.rows) ? data.rows : [];
        totalCount = Number(data?.total || 0);
        rows.push(...chunk);
        currentPage += 1;
      } while (rows.length < totalCount);

      if (user?.role === "admin" || user?.role === "it") {
        try {
          const { data: assignments } = await api.get("/assets/assignments");
          const activeByAssetId = new Map();
          const latestByAssetId = new Map();

          (Array.isArray(assignments) ? assignments : []).forEach((assignment) => {
            const assetId = Number(assignment.assetId);
            if (!Number.isFinite(assetId)) return;

            if (!latestByAssetId.has(assetId)) {
              latestByAssetId.set(assetId, assignment);
            }

            if (!assignment.returnedAt && !activeByAssetId.has(assetId)) {
              activeByAssetId.set(assetId, assignment);
            }
          });

          for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            const status = normalizeStatus(row.status);
            const assignment = activeByAssetId.get(Number(row.id)) || latestByAssetId.get(Number(row.id));
            if (!assignment) continue;

            rows[i] = {
              ...row,
              assignedTo: row.assignedTo || assignment.employeeName || "",
              assignedToId: row.assignedToId || assignment.employeeId || null,
              department: row.department || assignment.department || "",
              assignedAt: row.assignedAt || assignment.assignedAt || "",
              expectedReturnDate: row.expectedReturnDate || assignment.expectedReturnDate || "",
              assignedByName: row.assignedByName || assignment.assignedByName || "",
              hasActiveAssignment: !assignment.returnedAt,
              assignmentDataIssue: status === "assigned" && !assignment.returnedAt && !row.assignedTo && !assignment.employeeName,
            };
          }
        } catch {
          // Stock page should still load even when assignment endpoint is unavailable.
        }
      }

      const { data: summaryData } = await api.get("/assets/summary");

      const availableRows = rows.filter((row) => normalizeStatus(row.status) === "available");
      const lowStockRows = buildLowStockRows(availableRows);

      setAssets(rows);
      setSummary({
        total: Number(summaryData?.total || rows.length || 0),
        available: Number(summaryData?.available || 0),
        reserved: Number(summaryData?.reserved || 0),
        assigned: Number(summaryData?.assigned || summaryData?.in_use || 0),
        repair: Number(summaryData?.under_maintenance || 0),
        retired: Number(summaryData?.retired || 0),
        lowStock: lowStockRows.length,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load stock data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStockWorkspace();
  }, []);

  // Fetch assignment details when drawer opens or selectedRow changes
  useEffect(() => {
    if (!detailOpen || !selectedRow || tab === "lowStock") {
      setAssignmentDetail(null);
      return;
    }

    refreshAssignmentDetail(selectedRow.id);
  }, [detailOpen, selectedRow, tab]);

  async function handleSubmit() {
    const trimmedName = String(form.name || "").trim();
    const trimmedLocation = String(form.location || "").trim();
    const quantity = Number(form.quantity);
    const unitCost = form.unitCost === "" ? null : Number(form.unitCost);

    if (!trimmedName || !trimmedLocation) {
      setError("Asset name and location are required.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Quantity must be a positive integer.");
      return;
    }

    if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      setError("Cost per unit must be a non-negative number.");
      return;
    }

    const serialNumbers = String(form.serialNumbersText || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (serialNumbers.length > quantity) {
      setError("Serial numbers cannot be more than quantity.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await addAssetStock(api, {
        name: trimmedName,
        type: form.type,
        quantity,
        location: trimmedLocation,
        purchaseDate: form.purchaseDate,
        warrantyExpiry: form.warrantyExpiry,
        unitCost,
        remarks: form.remarks,
        source: form.source,
        serialNumbers,
      });
      setSuccess("Stock added successfully.");
      setAddDialogOpen(false);
      setForm(defaultForm);
      await loadStockWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add stock");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkUploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = String(file.name || "").toLowerCase().split(".").pop();
    if (!["csv", "xlsx"].includes(extension)) {
      setError("Only .csv and .xlsx files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be 5MB or less.");
      event.target.value = "";
      return;
    }

    setBulkBusy(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post("/assets/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const total = Number(data?.totalRecords || 0);
      const inserted = Number(data?.insertedRecords || 0);
      const failed = Number(data?.failedRecords || 0);
      const skipped = Number(data?.skippedRecords || 0);
      setSuccess(`Bulk upload complete. Processed ${total}, inserted ${inserted}, failed ${failed}, skipped ${skipped}.`);
      await loadStockWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to bulk upload assets.");
    } finally {
      setBulkBusy(false);
      event.target.value = "";
    }
  }

  const filteredAssets = useMemo(() => {
    const searchText = String(search || "").trim().toLowerCase();
    return assets.filter((row) => {
      const rowText = [row.assetTag, row.name, row.type, row.location, row.assignedTo].map((v) => String(v || "").toLowerCase()).join(" ");
      const typeMatch = typeFilter ? String(row.type || "").toLowerCase() === String(typeFilter).toLowerCase() : true;
      const locationMatch = locationFilter ? String(row.location || "").toLowerCase().includes(String(locationFilter).toLowerCase()) : true;
      const searchMatch = searchText ? rowText.includes(searchText) : true;
      return typeMatch && locationMatch && searchMatch;
    });
  }, [assets, search, typeFilter, locationFilter]);

  const stockInRows = useMemo(() => {
    return [...filteredAssets].sort((a, b) => String(b.createdDate || b.purchaseDate || "").localeCompare(String(a.createdDate || a.purchaseDate || "")));
  }, [filteredAssets]);

  const availableRows = useMemo(() => filteredAssets.filter((row) => normalizeStatus(row.status) === "available"), [filteredAssets]);
  const reservedRows = useMemo(() => filteredAssets.filter((row) => normalizeStatus(row.status) === "reserved"), [filteredAssets]);
  const assignedRows = useMemo(() => filteredAssets.filter((row) => normalizeStatus(row.status) === "assigned"), [filteredAssets]);
  const repairRows = useMemo(() => filteredAssets.filter((row) => normalizeStatus(row.status) === "repair"), [filteredAssets]);

  const returnedRows = useMemo(
    () => filteredAssets.filter((row) => {
      const text = `${String(row.note || "")} ${String(row.specs || "")}`.toLowerCase();
      return text.includes("return") || String(row.source || "").toLowerCase() === "return";
    }),
    [filteredAssets]
  );

  const lowStockRows = useMemo(() => buildLowStockRows(availableRows), [availableRows]);

  const tabRows = useMemo(() => {
    if (tab === "stockIn") return stockInRows;
    if (tab === "available") return availableRows;
    if (tab === "reserved") return reservedRows;
    if (tab === "assigned") return assignedRows;
    if (tab === "repair") return repairRows;
    if (tab === "returned") return returnedRows;
    return lowStockRows;
  }, [tab, stockInRows, availableRows, reservedRows, assignedRows, repairRows, returnedRows, lowStockRows]);

  const tabCountMap = {
    stockIn: stockInRows.length,
    available: availableRows.length,
    reserved: reservedRows.length,
    assigned: assignedRows.length,
    repair: repairRows.length,
    returned: returnedRows.length,
    lowStock: lowStockRows.length,
  };

  const activeSection = sectionConfig.find((item) => item.key === tab) || sectionConfig[0];

  const normalColumns = useMemo(
    () => [
      { field: "assetTag", headerName: "Asset Tag", minWidth: 140, flex: 0.9 },
      { field: "name", headerName: "Asset Name", minWidth: 180, flex: 1.1 },
      { field: "type", headerName: "Category", minWidth: 130, flex: 0.75 },
      { field: "location", headerName: "Location", minWidth: 130, flex: 0.8 },
      {
        field: "purchaseDate",
        headerName: "Purchase Date",
        minWidth: 130,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={String(normalizeStatus(params.value) || "available").replace(/_/g, " ")}
            sx={{
              textTransform: "capitalize",
              fontWeight: 700,
              bgcolor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
            }}
          />
        ),
      },
      {
        field: "rowAction",
        headerName: "Action",
        minWidth: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedRow(params.row);
              setDetailOpen(true);
            }}
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              fontWeight: 700,
              borderColor: "#d1d5db",
              color: "#111827",
              "&:hover": { bgcolor: "#f9fafb", borderColor: "#9ca3af" },
            }}
          >
            View Details
          </Button>
        ),
      },
    ],
    []
  );

  const lowStockColumns = useMemo(
    () => [
      { field: "name", headerName: "Model", minWidth: 200, flex: 1.1 },
      { field: "type", headerName: "Category", minWidth: 140, flex: 0.8 },
      { field: "availableQty", headerName: "Available Qty", minWidth: 130, flex: 0.7 },
      { field: "threshold", headerName: "Threshold", minWidth: 110, flex: 0.6 },
      { field: "suggestedReorder", headerName: "Suggested Reorder", minWidth: 160, flex: 0.85 },
      {
        field: "priority",
        headerName: "Priority",
        minWidth: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            sx={{
              fontWeight: 700,
              bgcolor: params.value === "Critical" ? "#fee2e2" : params.value === "High" ? "#fff7ed" : "#ecfeff",
              color: params.value === "Critical" ? "#b91c1c" : params.value === "High" ? "#c2410c" : "#0f766e",
            }}
          />
        ),
      },
      {
        field: "rowAction",
        headerName: "Action",
        minWidth: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedRow(params.row);
              setDetailOpen(true);
            }}
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              fontWeight: 700,
              borderColor: "#d1d5db",
              color: "#111827",
              "&:hover": { bgcolor: "#f9fafb", borderColor: "#9ca3af" },
            }}
          >
            Create PO
          </Button>
        ),
      },
    ],
    []
  );

  const activeColumns = tab === "lowStock" ? lowStockColumns : normalColumns;

  function handleExport() {
    if (!tabRows.length) {
      setInfo("No rows available to export in the selected section.");
      return;
    }

    if (tab === "lowStock") {
      downloadCsv(
        tabRows.map((row) => ({
          Model: row.name,
          Category: row.type,
          AvailableQty: row.availableQty,
          Threshold: row.threshold,
          SuggestedReorder: row.suggestedReorder,
          Priority: row.priority,
          LastReceived: formatDate(row.lastReceivedDate),
        })),
        `stock-${tab}.csv`
      );
      return;
    }

    downloadCsv(
      tabRows.map((row) => ({
        AssetTag: row.assetTag,
        AssetName: row.name,
        Category: row.type,
        Location: row.location,
        PurchaseDate: formatDate(row.purchaseDate),
        WarrantyEnd: formatDate(row.warrantyExpiry),
        AssignedTo: row.assignedTo || "-",
        Status: normalizeStatus(row.status),
      })),
      `stock-${tab}.csv`
    );
  }

  function resetFilters() {
    setSearch("");
    setTypeFilter("");
    setLocationFilter("");
  }

  async function handleReserveAction() {
    if (!selectedRow || tab === "lowStock") return;

    const currentStatus = normalizeStatus(selectedRow.status);
    if (!["available", "reserved"].includes(currentStatus)) {
      setInfo("Only available or reserved assets can be updated here.");
      return;
    }

    setStatusActionBusy(true);
    setError("");
    setSuccess("");
    try {
      if (currentStatus === "available") {
        await api.post(`/assets/${selectedRow.id}/reserve`);
        setSuccess("Asset moved to Reserved stock.");
        setTab("reserved");
      } else {
        await api.post(`/assets/${selectedRow.id}/release`);
        setSuccess("Asset released to Available stock.");
        setTab("available");
      }

      await loadStockWorkspace();
      setDetailOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update asset status.");
    } finally {
      setStatusActionBusy(false);
    }
  }

  if (!canManageStock) {
    return <Alert severity="error">You do not have permission to add stock.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Paper elevation={1} sx={{ borderRadius: "6px", p: 2.25, bgcolor: "#ffffff" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Box sx={{ flex: { md: 1 } }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f766e" }}>
              Stock
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignSelf: { xs: "flex-start", md: "center" },
              ml: { md: "auto" },
              justifyContent: "flex-end",
            }}
          >
            <Button
              variant="outlined"
              startIcon={<PublishOutlinedIcon />}
              onClick={() => bulkInputRef.current?.click()}
              disabled={bulkBusy}
              sx={{ textTransform: "none", borderRadius: "6px", minHeight: 40, fontWeight: 700, borderColor: "#99d5cc", color: "#0f766e", "&:hover": { borderColor: "#0f766e", bgcolor: "#f0faf9" } }}
            >
              {bulkBusy ? "Uploading..." : "Bulk Upload"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExport}
              sx={{ textTransform: "none", borderRadius: "6px", minHeight: 40, fontWeight: 700, borderColor: "#cbd5e1", color: "#334155", "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" } }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              onClick={() => {
                setError("");
                setSuccess("");
                setAddDialogOpen(true);
              }}
              sx={{ textTransform: "none", borderRadius: "6px", minHeight: 40, fontWeight: 700, bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" } }}
            >
              Add Stock
            </Button>
            <input
              ref={bulkInputRef}
              type="file"
              accept=".csv,.xlsx"
              style={{ display: "none" }}
              onChange={handleBulkUploadFile}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={1} sx={{ borderRadius: "6px", p: 2.25, bgcolor: "#ffffff" }}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(6, minmax(0, 1fr))" } }}>
          {[
            { label: "Total Stock", value: summary.total, icon: <Inventory2OutlinedIcon />, color: "#0f766e" },
            { label: "Available", value: summary.available, icon: <PlaylistAddCheckCircleOutlinedIcon />, color: "#0f766e" },
            { label: "Reserved", value: summary.reserved, icon: <RoomPreferencesOutlinedIcon />, color: "#0f766e" },
            { label: "Assigned", value: summary.assigned, icon: <PlaylistAddCheckCircleOutlinedIcon />, color: "#0f766e" },
            { label: "In Repair", value: summary.repair, icon: <BuildCircleOutlinedIcon />, color: "#0f766e" },
            { label: "Retired", value: summary.retired, icon: <LockOutlinedIcon />, color: "#0f766e" },
          ].map((card) => (
            <Card key={card.label} elevation={0} sx={{ borderRadius: "6px", border: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{ fontSize: 22, lineHeight: 1.2, mt: 0.25, fontWeight: 700, color: "#000000" }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      {info ? <Alert severity="info" onClose={() => setInfo("")}>{info}</Alert> : null}

      <Paper elevation={1} sx={{ borderRadius: "6px", p: 2.25, bgcolor: "#ffffff" }}>
        <Stack spacing={2}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 42 },
              "& .MuiTabs-indicator": { backgroundColor: "#0f766e", height: 3 },
            }}
          >
            {sectionConfig.map((section) => (
              <Tab
                key={section.key}
                value={section.key}
                icon={section.icon}
                iconPosition="start"
                label={`${section.label} (${tabCountMap[section.key] || 0})`}
              />
            ))}
          </Tabs>

          <Box sx={{ width: "100%" }}>
            <DataGrid
              autoHeight
              rows={tabRows}
              columns={activeColumns}
              getRowId={(row) => row.id}
              loading={loading}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              onRowClick={(params) => {
                setSelectedRow(params.row);
                setDetailOpen(true);
              }}
              sx={{
                borderRadius: "6px",
                borderColor: "#e2e8f0",
                "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc", fontWeight: 700 },
                "& .MuiDataGrid-row:hover": { bgcolor: "#f8fafc" },
              }}
              slots={{
                noRowsOverlay: () => (
                  <Stack sx={{ py: 5 }} alignItems="center" spacing={1}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: "#334155" }}>
                      {activeSection.emptyTitle}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      {activeSection.emptyMessage}
                    </Typography>
                  </Stack>
                ),
              }}
            />
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Stock</DialogTitle>
        <DialogContent>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
              <TextField
                label="Asset Name / Model"
                size="small"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
                sx={fieldSx}
              />
              <TextField
                select
                label="Category"
                size="small"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                fullWidth
                sx={fieldSx}
              >
                {typeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Quantity to Add"
                type="number"
                size="small"
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                fullWidth
                required
                inputProps={{ min: 1, step: 1 }}
                sx={fieldSx}
              />
              <TextField
                label="Location"
                size="small"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                fullWidth
                required
                sx={fieldSx}
              />
              <TextField
                select
                label="Source"
                size="small"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                fullWidth
                sx={fieldSx}
              >
                {sourceOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
              <Box>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.75, fontWeight: 600 }}>
                  Purchase Date
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  value={form.purchaseDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                  fullWidth
                  sx={fieldSx}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.75, fontWeight: 600 }}>
                  Warranty End Date
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  value={form.warrantyExpiry}
                  onChange={(e) => setForm((prev) => ({ ...prev, warrantyExpiry: e.target.value }))}
                  fullWidth
                  sx={fieldSx}
                />
              </Box>
              <TextField
                label="Cost per unit"
                type="number"
                size="small"
                value={form.unitCost}
                onChange={(e) => setForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                fullWidth
                inputProps={{ min: 0, step: "0.01" }}
                sx={fieldSx}
              />
              <TextField label="Default Status" size="small" value="Available" fullWidth disabled sx={fieldSx} />
            </Box>

            <TextField
              label="Remarks"
              size="small"
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Serial Numbers (optional, one per line)"
              size="small"
              value={form.serialNumbersText}
              onChange={(e) => setForm((prev) => ({ ...prev, serialNumbersText: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
              sx={fieldSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={busy}
            sx={{ textTransform: "none", bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" }, borderRadius: "6px", fontWeight: 700 }}
          >
            {busy ? "Adding..." : "Add Stock"}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 420 },
            maxWidth: "100vw",
            borderLeft: "1px solid #e5e7eb",
            boxShadow: "0 8px 32px rgba(15, 23, 42, 0.14)",
            bgcolor: "#fff",
            overflow: "hidden",
            p: 0,
          },
        }}
      >
        {!selectedRow ? (
          <Stack sx={{ p: 3 }} spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827" }}>
              Stock Details
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Select a row to view details.
            </Typography>
          </Stack>
        ) : (
          <Stack sx={{ height: "100%" }}>
            <Box sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Stock Details</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {tab !== "lowStock" && normalizeStatus(selectedRow.status) === "assigned" && (
                  <IconButton
                    size="small"
                    onClick={() => refreshAssignmentDetail(selectedRow?.id)}
                    sx={{ color: "#374151" }}
                    disabled={loadingAssignment}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => setDetailOpen(false)} sx={{ color: "#374151" }}>
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 20, color: "#111827", mb: 0.75 }}>
                {tab === "lowStock" ? selectedRow.name : selectedRow.name || "Asset"}
              </Typography>
              <Chip
                size="small"
                label={tab === "lowStock" ? selectedRow.priority || "Low Stock" : String(normalizeStatus(selectedRow.status) || "unknown").replace(/_/g, " ")}
                sx={{
                  bgcolor: "#e5e7eb",
                  color: "#374151",
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: "capitalize",
                  border: "1px solid #d1d5db",
                  height: 22,
                }}
              />
            </Box>

            <Divider />

            <Box sx={{ flex: 1, overflow: "auto" }}>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, mb: 1.5, textTransform: "uppercase" }}>
                  {tab === "lowStock" ? "Stock Model Details" : "Asset Details"}
                </Typography>
                {(tab === "lowStock"
                  ? [
                      { label: "Model", value: selectedRow.name || "-" },
                      { label: "Category", value: selectedRow.type || "-" },
                      { label: "Available Quantity", value: selectedRow.availableQty ?? "-" },
                      { label: "Threshold", value: selectedRow.threshold ?? "-" },
                      { label: "Suggested Reorder", value: selectedRow.suggestedReorder ?? "-" },
                      { label: "Priority", value: selectedRow.priority || "-" },
                      { label: "Locations", value: (selectedRow.locations || []).join(", ") || "-" },
                      { label: "Sample Asset Tags", value: (selectedRow.sampleAssetTags || []).join(", ") || "-" },
                      { label: "Last Received", value: formatDate(selectedRow.lastReceivedDate) },
                    ]
                  : [
                      { label: "Asset Tag", value: selectedRow.assetTag || "-" },
                      { label: "Asset Name", value: selectedRow.name || "-" },
                      { label: "Category", value: selectedRow.type || "-" },
                      { label: "Status", value: normalizeStatus(selectedRow.status) },
                      { label: "Location", value: selectedRow.location || "-" },
                      {
                        label: "Assigned To",
                        value: loadingAssignment
                          ? "Loading..."
                          : (assignmentDetail?.employeeName
                            || selectedRow.assignedTo
                            || (normalizeStatus(selectedRow.status) === "assigned" ? "Assigned (employee not recorded)" : "-")),
                      },
                      {
                        label: "Employee Email",
                        value: loadingAssignment
                          ? "Loading..."
                          : (assignmentDetail?.employeeEmail || selectedRow.employeeEmail || "Not recorded"),
                      },
                      {
                        label: "Department",
                        value: loadingAssignment
                          ? "Loading..."
                          : (assignmentDetail?.department || selectedRow.department || "Not recorded"),
                      },
                      {
                        label: "Assigned By",
                        value: loadingAssignment
                          ? "Loading..."
                          : (assignmentDetail?.assignedByName || selectedRow.assignedByName || "Not recorded"),
                      },
                      {
                        label: "Assigned Date",
                        value: loadingAssignment
                          ? "Loading..."
                          : formatDate(assignmentDetail?.assignedAt || selectedRow.assignedAt || selectedRow.updatedAt),
                      },
                      {
                        label: "Expected Return",
                        value: loadingAssignment
                          ? "Loading..."
                          : (assignmentDetail?.expectedReturnDate || selectedRow.expectedReturnDate
                            ? formatDate(assignmentDetail?.expectedReturnDate || selectedRow.expectedReturnDate)
                            : "Not scheduled"),
                      },
                      { label: "Purchase Date", value: formatDate(selectedRow.purchaseDate) },
                      { label: "Warranty End", value: formatDate(selectedRow.warrantyExpiry) },
                      { label: "Health", value: healthLabel(selectedRow) },
                      { label: "Remarks", value: selectedRow.note || selectedRow.specs || "-" },
                    ]
                ).map(({ label, value }) => (
                  <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", py: 1.4, borderBottom: "1px solid #f3f4f6" }}>
                    <Typography sx={{ fontSize: 13, color: "#6b7280", fontWeight: 500, minWidth: 140 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 600, textAlign: "right", maxWidth: 220, wordBreak: "break-word", textTransform: label === "Status" || label === "Category" ? "capitalize" : "none" }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              {selectedRow && ["available", "reserved"].includes(normalizeStatus(selectedRow.status)) ? (
                <Button
                  variant="outlined"
                  onClick={handleReserveAction}
                  disabled={statusActionBusy}
                  sx={{ textTransform: "none", borderRadius: "6px", fontWeight: 700, minWidth: 120 }}
                >
                  {statusActionBusy ? "Working..." : normalizeStatus(selectedRow.status) === "reserved" ? "Release" : "Reserve"}
                </Button>
              ) : null}
              <Button
                variant="contained"
                onClick={() => setDetailOpen(false)}
                sx={{ textTransform: "none", borderRadius: "6px", fontWeight: 700, bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" }, minWidth: 120 }}
              >
                Close
              </Button>
            </Box>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
