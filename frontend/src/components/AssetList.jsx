import { useEffect, useMemo, useRef, useState } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import KeyboardReturnOutlinedIcon from "@mui/icons-material/KeyboardReturnOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import WorkOffOutlinedIcon from "@mui/icons-material/WorkOffOutlined";
import {
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";

const defaultForm = {
  assetTag: "",
  name: "",
  specs: "",
  unitPrice: "",
  status: "available",
  purchaseDate: "",
  type: "laptop",
  subCategory: "",
  supplier: "",
  department: "",
  subDepartment: "",
  dateOfManufacture: "",
  warrantyExpiry: "",
  location: "",
  note: "",
  createdDate: "",
  assignEmployee: "",
  qrCodeFile: null,
  imageFile: null,
};

const defaultStockForm = {
  name: "",
  type: "laptop",
  quantity: 1,
  location: "",
  vendor: "",
  purchaseDate: "",
  warrantyExpiry: "",
  unitCost: "",
  remarks: "",
  source: "purchase",
  serialNumbersText: "",
};

const typeOptions = ["laptop", "desktop", "monitor", "printer", "network_device"];
const statusOptions = ["available", "assigned", "maintenance", "retired"];
const stockSourceOptions = ["purchase", "return", "adjustment"];
const laptopImageOptions = [
  "https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1600&h=1067&dpr=2",
  "https://images.pexels.com/photos/7974/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1600&h=1067&dpr=2",
  "https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1067&dpr=2",
];

function healthFromRow(row) {
  if (row.status === "retired") return { label: "retired", color: "error" };
  if (row.status === "maintenance") return { label: "service due", color: "warning" };

  const expiry = row.warrantyExpiry ? new Date(row.warrantyExpiry) : null;
  if (!expiry || Number.isNaN(expiry.getTime())) return { label: "unknown", color: "default" };

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);

  if (daysLeft < 0) return { label: "warranty expired", color: "error" };
  if (daysLeft <= 45) return { label: "warranty ending", color: "warning" };
  return { label: "healthy", color: "success" };
}

function Field({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 500, color: "#555", mb: 0.5, display: "block" }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

const departmentOptions = ["Information Technology", "Finance", "Human Resources", "Operations", "Sales", "Marketing"];
const subDeptOptions = ["Procurement Specialist", "System Admin", "Network Admin", "IT Support", "Finance Manager"];
const supplierOptions = ["Rakesh Jain", "Tech Supplies Co.", "Global IT Solutions", "ABC Electronics"];

function AssetDialog({ open, mode, form, setForm, onClose, onSubmit, employees = [] }) {
  const isCreate = mode === "create";

  const inputSx = { bgcolor: "#fff", "& .MuiOutlinedInput-root": { borderRadius: "6px" } };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: 580 },
          maxWidth: "100vw",
          borderLeft: "1px solid #e5e7eb",
          boxShadow: "-4px 0 24px rgba(15, 23, 42, 0.12)",
          bgcolor: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>
          {isCreate ? "Add Asset" : "Edit Asset"}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#6b7280", "&:hover": { bgcolor: "#f3f4f6" } }}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Scrollable form body */}
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2.5, bgcolor: "#fff" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          {/* Row 1 */}
          <Field label="Asset Model No">
            <TextField
              placeholder="e.g. LAP-1001"
              value={form.assetTag || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, assetTag: e.target.value }))}
              disabled={!isCreate}
              size="small"
              fullWidth
              sx={inputSx}
            />
          </Field>
          <Field label="Name">
            <TextField
              placeholder="Asset name"
              value={form.name || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            />
          </Field>
          <Field label="Description">
            <TextField
              placeholder="Enter description"
              value={form.specs || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, specs: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            />
          </Field>

          {/* Row 2 */}
          <Field label="Unit Price">
            <TextField
              placeholder="Enter amount"
              value={form.unitPrice || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            />
          </Field>
          <Field label="Asset Status">
            <TextField
              select
              value={form.status || "available"}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            >
              {statusOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Field>
          <Field label="Date Of Purchase">
            <TextField
              type="date"
              value={form.purchaseDate || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Field>

          {/* Row 3 */}
          <Field label="Category">
            <TextField
              select
              value={form.type || "laptop"}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            >
              {typeOptions.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </MenuItem>
              ))}
            </TextField>
          </Field>
          <Field label="Sub Category">
            <TextField
              value={form.subCategory || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, subCategory: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            />
          </Field>
          <Field label="Supplier">
            <TextField
              select
              value={form.supplier || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {supplierOptions.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Field>

          {/* Row 4 */}
          <Field label="Department">
            <TextField
              select
              value={form.department || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {departmentOptions.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
          </Field>
          <Field label="Sub Department">
            <TextField
              select
              value={form.subDepartment || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, subDepartment: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {subDeptOptions.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
          </Field>
          <Field label="Date Of Manufacture">
            <TextField
              type="date"
              value={form.dateOfManufacture || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, dateOfManufacture: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Field>

          {/* Row 5 */}
          <Field label="Warrenty In Month">
            <TextField
              type="date"
              value={form.warrantyExpiry || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, warrantyExpiry: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Field>
          <Field label="Location">
            <TextField
              placeholder="e.g. Head Office"
              value={form.location || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            />
          </Field>
          <Field label="Note">
            <TextField
              placeholder="Enter note"
              value={form.note || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            />
          </Field>

          {/* Row 6 */}
          <Field label="Created Date">
            <TextField
              type="date"
              value={form.createdDate || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, createdDate: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Field>
          <Field label="Assign Employee">
            <TextField
              select
              value={form.assignEmployee || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, assignEmployee: e.target.value }))}
              size="small"
              fullWidth
              sx={inputSx}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.name}>{employee.name}</MenuItem>
              ))}
            </TextField>
          </Field>
          <Field label="QR Code">
            <Box
              component="input"
              type="file"
              accept="image/*"
              onChange={(e) => setForm((prev) => ({ ...prev, qrCodeFile: e.target.files?.[0] || null }))}
              sx={{
                display: "block",
                width: "100%",
                p: "6px 8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                fontSize: 13,
                bgcolor: "#fff",
                cursor: "pointer",
              }}
            />
          </Field>

          {/* Image */}
          <Field label="Image">
            <Box
              component="input"
              type="file"
              accept="image/*"
              onChange={(e) => setForm((prev) => ({ ...prev, imageFile: e.target.files?.[0] || null }))}
              sx={{ display: "block", width: "100%", p: "6px 8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: 13, bgcolor: "#fff", cursor: "pointer" }}
            />
          </Field>
        </Box>
      </Box>

      {/* Sticky footer */}
      <Box sx={{ px: 3, py: 2, borderTop: "1px solid #f0f0f0", display: "flex", gap: 1.5, flexShrink: 0, bgcolor: "#fff" }}>
        <Button
          onClick={onSubmit}
          variant="contained"
          fullWidth
          sx={{ textTransform: "none", bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" }, fontWeight: 700, borderRadius: "6px", py: 1.2 }}
        >
          {isCreate ? "Create Asset" : "Save Changes"}
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          fullWidth
          sx={{ textTransform: "none", borderColor: "#d1d5db", color: "#374151", fontWeight: 600, borderRadius: "6px", py: 1.2, "&:hover": { bgcolor: "#f9fafb" } }}
        >
          Cancel
        </Button>
      </Box>
    </Drawer>
  );
}

export default function AssetList({
  rows,
  employees = [],
  rowCount,
  loading,
  error,
  isAdmin,
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  filters,
  onFiltersChange,
  onCreate,
  onAssign,
  onUpdate,
  onDelete,
  onReturn,
  onRetire,
  onRequestMaintenance,
  onAddStock,
  onAddClick,
  onBulkUpload,
  onDownloadBulkTemplate,
  userRole,
  statusSummary,
}) {
  const navigate = useNavigate();
  const [dialogMode, setDialogMode] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignForm, setAssignForm] = useState({
    assetId: "",
    employeeId: "",
    expectedReturnDate: "",
    notes: "",
  });
  const [imagePreview, setImagePreview] = useState({ open: false, src: "", assetTag: "", name: "" });
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);
  const [toolbarActionsAnchorEl, setToolbarActionsAnchorEl] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestForm, setRequestForm] = useState({
    assetId: "",
    title: "",
    description: "",
    priority: "medium",
  });
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [bulkUploadBusy, setBulkUploadBusy] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockForm, setStockForm] = useState(defaultStockForm);
  const [stockSubmitBusy, setStockSubmitBusy] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockSuccess, setStockSuccess] = useState("");
  const bulkFileInputRef = useRef(null);

  const visibleRows = rows || [];
  const displayRows = useMemo(
    () =>
      visibleRows.map((row, index) => ({
        ...row,
        serialNumber: row.id ?? paginationModel.page * paginationModel.pageSize + index + 1,
      })),
    [visibleRows, paginationModel.page, paginationModel.pageSize]
  );
  const minReturnDate = new Date().toISOString().slice(0, 10);
  const actionMenuOpen = Boolean(actionMenuAnchorEl);
  const toolbarActionsOpen = Boolean(toolbarActionsAnchorEl);
  const canManageStock = isAdmin || userRole === "it";
  const stockFieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "6px", minHeight: 48, fontSize: 14 },
    "& .MuiInputLabel-root": { fontSize: 14 },
  };

  const summaryCards = [
    { key: "total", label: "Total Stock", value: Number(statusSummary?.total || 0), icon: <Inventory2OutlinedIcon sx={{ fontSize: 30 }} /> },
    { key: "available", label: "Available", value: Number(statusSummary?.available || 0), icon: <Inventory2OutlinedIcon sx={{ fontSize: 30 }} /> },
    { key: "reserved", label: "Reserved", value: Number(statusSummary?.reserved || 0), icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 30 }} /> },
    { key: "assigned", label: "Assigned", value: Number(statusSummary?.assigned || statusSummary?.in_use || 0), icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 30 }} /> },
    { key: "repair", label: "In Repair", value: Number(statusSummary?.under_maintenance || 0), icon: <ConstructionOutlinedIcon sx={{ fontSize: 30 }} /> },
    { key: "lowStock", label: "Low Stock", value: Number(statusSummary?.low_stock || 0), icon: <WorkOffOutlinedIcon sx={{ fontSize: 30 }} /> },
  ];

  function downloadTextFile(content, fileName, mimeType = "text/plain;charset=utf-8;") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleBulkUploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = String(file.name || "").toLowerCase().split(".").pop();
    if (!["csv", "xlsx"].includes(extension)) {
      setBulkUploadResult({ type: "error", message: "Only .csv and .xlsx files are allowed." });
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBulkUploadResult({ type: "error", message: "File size must be 5MB or less." });
      event.target.value = "";
      return;
    }

    if (!onBulkUpload) {
      setBulkUploadResult({ type: "error", message: "Bulk upload is not connected to the API yet." });
      event.target.value = "";
      return;
    }

    setBulkUploadBusy(true);
    try {
      const result = await onBulkUpload(file);

      if (!result?.ok) {
        setBulkUploadResult({ type: "error", message: result?.message || "Bulk upload failed." });
        return;
      }

      const total = result.totalRecords || 0;
      const inserted = result.insertedRecords || 0;
      const skipped = result.skippedRecords || 0;
      const failed = result.failedRecords || 0;
      const skippedNote = skipped ? ` Skipped ${skipped} duplicate(s).` : "";
      const summaryMessage = `Processed ${total} rows. Inserted ${inserted}. Failed ${failed}.${skippedNote}`;
      const failurePreview = (result.failures || []).slice(0, 5).map((item) => `Row ${item.rowNumber} (${item.field}): ${item.message}`);

      if (result.errorReportCsv) {
        downloadTextFile(result.errorReportCsv, `asset-bulk-upload-errors-${Date.now()}.csv`, "text/csv;charset=utf-8;");
      }

      setBulkUploadResult({
        type: failed ? "warning" : "success",
        message: failurePreview.length ? `${summaryMessage} ${failurePreview.join(" | ")}` : summaryMessage,
      });
    } catch (uploadError) {
      setBulkUploadResult({ type: "error", message: "Failed to process upload file." });
    } finally {
      setBulkUploadBusy(false);
      event.target.value = "";
    }
  }

  function getAssetImageSrc(row) {
    const safeTag = String(row?.assetTag || "");
    const imageIndex = safeTag ? safeTag.charCodeAt(safeTag.length - 1) % laptopImageOptions.length : 0;
    return laptopImageOptions[imageIndex];
  }

  function openEditDialog(row) {
    if (!row) return;
    setForm({
      assetTag: row.assetTag,
      name: row.name || "",
      specs: row.specs || "",
      unitPrice: row.unitPrice || "",
      status: row.status || "available",
      purchaseDate: String(row.purchaseDate || "").slice(0, 10),
      type: row.type || "laptop",
      subCategory: row.subCategory || "",
      supplier: row.supplier || "",
      department: row.department || "",
      subDepartment: row.subDepartment || "",
      dateOfManufacture: String(row.dateOfManufacture || "").slice(0, 10),
      warrantyExpiry: String(row.warrantyExpiry || "").slice(0, 10),
      location: row.location || "",
      note: row.note || "",
      createdDate: String(row.createdDate || "").slice(0, 10),
      assignEmployee: row.assignedTo || "",
      id: row.id,
    });
    setDialogMode("edit");
  }

  function openAssignDialog(row) {
    if (!row) return;
    setAssignError("");
    setAssignForm({
      assetId: String(row.id),
      employeeId: "",
      expectedReturnDate: "",
      notes: "",
    });
    setAssignDialogOpen(true);
  }

  function closeActionMenu() {
    setActionMenuAnchorEl(null);
    setActionMenuRow(null);
  }

  function tableRowsForExport() {
    return displayRows.map((row) => ({
      id: row.serialNumber,
      assetTag: row.assetTag || "",
      name: row.name || "",
      type: row.type || "",
      assignedTo: row.assignedTo || "-",
      location: row.location || "-",
      purchaseDate: row.purchaseDate ? String(row.purchaseDate).slice(0, 10) : "-",
      status: row.status || "",
    }));
  }

  function downloadFile(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleCsvDownload(extension = "csv") {
    const header = ["Id", "Asset Tag", "Name", "Type", "Assigned Employee", "Location", "Purchase Date", "Status"];
    const body = tableRowsForExport().map((row) => [row.id, row.assetTag, row.name, row.type, row.assignedTo, row.location, row.purchaseDate, row.status]);
    const escaped = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadFile(escaped, `asset-list.${extension}`, extension === "xls" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;" );
  }

  function openPrintableTable(shouldPrint = false) {
    const body = tableRowsForExport()
      .map(
        (row) => `<tr><td>${row.id}</td><td>${row.assetTag}</td><td>${row.name}</td><td>${row.type}</td><td>${row.assignedTo}</td><td>${row.location}</td><td>${row.purchaseDate}</td><td>${row.status}</td></tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Asset List</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d8dde6; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f7f9fc; }
          </style>
        </head>
        <body>
          <h1>Asset List</h1>
          <table>
            <thead><tr><th>Id</th><th>Asset Tag</th><th>Name</th><th>Type</th><th>Assigned Employee</th><th>Location</th><th>Purchase Date</th><th>Status</th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    if (shouldPrint) {
      win.focus();
      win.print();
    }
  }

  function openToolbarActionsMenu(event) {
    setToolbarActionsAnchorEl(event.currentTarget);
  }

  function closeToolbarActionsMenu() {
    setToolbarActionsAnchorEl(null);
  }

  const columns = useMemo(
    () => [
      {
        field: "image",
        headerName: "Image",
        sortable: false,
        filterable: false,
        width: 90,
        minWidth: 90,
        renderCell: ({ row }) => {
          const imageSrc = getAssetImageSrc(row);
          return (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Box
                component="img"
                src={imageSrc}
                alt="Asset"
                onClick={() =>
                  setImagePreview({
                    open: true,
                    src: imageSrc,
                    assetTag: row.assetTag || "",
                    name: row.name || "",
                  })
                }
                sx={{
                  width: 200,
                  height: 120,
                  borderRadius: 0,
                  objectFit: "contain",
                  border: "1px solid #d1d5db",
                  bgcolor: "#f3f4f6",
                  cursor: "pointer",
                }}
              />
            </Box>
          );
        },
      },
      {
        field: "serialNumber",
        headerName: "Id",
        width: 95,
        minWidth: 95,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 400, color: "text.primary", ml: 0.5 }}
          >
            {params.value}
          </Typography>
        ),
      },
      {
        field: "name",
        headerName: "Name",
        width: 220,
        minWidth: 220,
        renderCell: (params) => (
          <Typography
            variant="body2"
            title={params.value || ""}
            sx={{
              fontWeight: 700,
              display: "block",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            {params.value}
          </Typography>
        ),
      },
      { field: "assetTag", headerName: "Asset Model No", flex: 0.9, minWidth: 130 },
      { field: "assignedTo", headerName: "Assigned Employee", flex: 0.95, minWidth: 140, valueGetter: (_, row) => row.assignedTo || "-" },
      { field: "location", headerName: "Location", flex: 0.85, minWidth: 110 },
      {
        field: "purchaseDate",
        headerName: "Date Of Purchase",
        minWidth: 130,
        valueFormatter: (value) => (value ? String(value).slice(0, 10) : "-"),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 110,
        renderCell: (params) => {
          const val = String(params.value || "").toLowerCase();
          const chipMap = {
            available: { bg: "#f3f4f6", color: "#374151" },
            assigned: { bg: "#f3f4f6", color: "#374151" },
            in_use: { bg: "#f3f4f6", color: "#374151" },
            maintenance: { bg: "#f3f4f6", color: "#374151" },
            under_maintenance: { bg: "#f3f4f6", color: "#374151" },
            retired: { bg: "#f3f4f6", color: "#374151" },
          };
          const { bg, color } = chipMap[val] || { bg: "#e5e7eb", color: "#374151" };
          return (
            <Chip
              size="small"
              label={params.value ? String(params.value).replace(/_/g, " ") : "-"}
              sx={{ fontWeight: 700, color, bgcolor: bg, border: "none", textTransform: "capitalize", fontSize: 11 }}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 90,
        minWidth: 90,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <IconButton
            size="small"
            onClick={(event) => {
              setActionMenuAnchorEl(event.currentTarget);
              setActionMenuRow(row);
            }}
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              border: "1px solid #cbd5e1",
              color: "#475569",
              bgcolor: "#fff",
              "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
            }}
            aria-label="Actions"
          >
            <MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ),
      },
    ],
    [isAdmin]
  );

  async function handleRequestSubmit() {
    if (!onRequestMaintenance) {
      setRequestDialogOpen(false);
      return;
    }

    setRequestError("");
    const result = await onRequestMaintenance({
      assetId: Number(requestForm.assetId),
      title: requestForm.title,
      description: requestForm.description,
      priority: requestForm.priority,
    });

    if (!result?.ok) {
      setRequestError(result?.message || "Unable to submit maintenance request");
      return;
    }

    setRequestDialogOpen(false);
  }

  async function handleDialogSubmit() {
    if (dialogMode === "create") {
      const result = await onCreate({
        assetTag: form.assetTag,
        name: form.name,
        type: form.type,
        status: form.status,
        location: form.location,
        purchaseDate: form.purchaseDate,
        warrantyExpiry: form.warrantyExpiry,
        specs: form.specs,
      });
      if (result.ok) {
        setDialogMode(null);
        setForm(defaultForm);
      }
      return;
    }

    const result = await onUpdate(form.id, {
      name: form.name,
      type: form.type,
      status: form.status,
      location: form.location,
      purchaseDate: form.purchaseDate,
      warrantyExpiry: form.warrantyExpiry,
      specs: form.specs,
    });

    if (result.ok) {
      setDialogMode(null);
      setForm(defaultForm);
    }
  }

  function resetStockForm() {
    setStockForm(defaultStockForm);
    setStockError("");
    setStockSuccess("");
  }

  async function handleStockSubmit() {
    if (!onAddStock) return;

    const trimmedName = String(stockForm.name || "").trim();
    const trimmedLocation = String(stockForm.location || "").trim();
    const quantity = Number(stockForm.quantity);
    const unitCost = stockForm.unitCost === "" ? null : Number(stockForm.unitCost);

    if (!trimmedName || !trimmedLocation) {
      setStockError("Asset name and location are required.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setStockError("Quantity must be a positive integer.");
      return;
    }

    if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      setStockError("Cost per unit must be a non-negative number.");
      return;
    }

    const serialNumbers = String(stockForm.serialNumbersText || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (serialNumbers.length > quantity) {
      setStockError("Serial numbers cannot be more than quantity.");
      return;
    }

    setStockSubmitBusy(true);
    setStockError("");

    const result = await onAddStock({
      name: trimmedName,
      type: stockForm.type,
      quantity,
      location: trimmedLocation,
      vendor: stockForm.vendor,
      purchaseDate: stockForm.purchaseDate,
      warrantyExpiry: stockForm.warrantyExpiry,
      unitCost,
      remarks: stockForm.remarks,
      source: stockForm.source,
      serialNumbers,
    });

    setStockSubmitBusy(false);

    if (!result?.ok) {
      setStockError(result?.message || "Unable to add stock.");
      return;
    }

    setStockSuccess("Stock added successfully. Available assets count has been refreshed.");
    setTimeout(() => {
      setStockDialogOpen(false);
      resetStockForm();
    }, 700);
  }

  async function handleAssignSubmit() {
    if (!onAssign) {
      setAssignDialogOpen(false);
      return;
    }

    if (!assignForm.employeeId || !assignForm.expectedReturnDate) {
      setAssignError("Please select an employee and expected return date.");
      return;
    }

    const result = await onAssign({
      assetId: Number(assignForm.assetId),
      employeeId: Number(assignForm.employeeId),
      expectedReturnDate: assignForm.expectedReturnDate,
      notes: assignForm.notes,
    });

    if (!result?.ok) {
      setAssignError(result?.message || "Unable to assign asset");
      return;
    }

    setAssignDialogOpen(false);
    setAssignError("");
    setAssignForm({ assetId: "", employeeId: "", expectedReturnDate: "", notes: "" });
  }

  return (
    <Paper
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      <Stack spacing={0}>
        {/* ── Page Header ── */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
            color: "#fff",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  bgcolor: "rgba(255,255,255,0.18)",
                  borderRadius: "8px",
                  p: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Inventory2OutlinedIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.3px" }}>
                  Manage Assets
                </Typography>
                <Typography sx={{ fontSize: 13, opacity: 0.85, mt: 0.25 }}>
                  Track, assign, and manage all company assets
                </Typography>
              </Box>
            </Stack>

          </Stack>
        </Box>

        <Box sx={{ p: 2.5 }}>
        <Stack spacing={2}>

        {bulkUploadResult ? <Alert severity={bulkUploadResult.type} sx={{ borderRadius: "8px" }}>{bulkUploadResult.message}</Alert> : null}
        {error ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{error}</Alert> : null}
        {stockSuccess ? <Alert severity="success" sx={{ borderRadius: "8px" }}>{stockSuccess}</Alert> : null}

        <Box sx={{ display: "grid", gap: 1.75, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" } }}>
          {summaryCards.map((card) => (
            <Card
              key={card.key}
              elevation={0}
              sx={{
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                bgcolor: "#ffffff",
                transition: "box-shadow 0.15s",
                "&:hover": { boxShadow: "0 4px 18px rgba(0,0,0,0.09)" },
              }}
            >
              <CardContent sx={{ p: "16px !important" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{card.label}</Typography>
                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1.15, mt: 0.4 }}>{card.value}</Typography>
                  </Box>
                  <Box sx={{ color: "#0f766e", opacity: 0.75 }}>{card.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.75,
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            bgcolor: "#fff",
            width: "100%",
          }}
        >
            <TextField
              placeholder="Search assets by name, tag, user…"
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" sx={{ color: "#9ca3af" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 0,
                flex: "0 1 400px",
              }}
            />
            <Box sx={{ flex: 1 }} />
            {isAdmin ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => bulkFileInputRef.current?.click()}
                  disabled={bulkUploadBusy}
                  sx={{
                    textTransform: "none",
                    color: "#374151",
                    borderColor: "#d1d5db",
                    borderRadius: "8px",
                    height: 36,
                    px: 2,
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#f9fafb", borderColor: "#9ca3af" },
                  }}
                >
                  {bulkUploadBusy ? "Uploading..." : "Bulk Upload"}
                </Button>
                <input ref={bulkFileInputRef} type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={handleBulkUploadFile} />
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={openToolbarActionsMenu}
                  sx={{
                    textTransform: "none",
                    color: "#0f766e",
                    borderColor: "#0f766e",
                    borderRadius: "8px",
                    height: 36,
                    px: 2,
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#f0fdf4", borderColor: "#0d9488" },
                  }}
                >
                  Export
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddOutlinedIcon />}
                  onClick={() => {
                    if (onAddClick) {
                      onAddClick();
                      return;
                    }
                    setForm(defaultForm);
                    setDialogMode("create");
                  }}
                  sx={{
                    textTransform: "none",
                    bgcolor: "#0f766e",
                    "&:hover": { bgcolor: "#0d9488" },
                    borderRadius: "8px",
                    height: 36,
                    px: 2,
                    fontWeight: 700,
                  }}
                >
                  Add Asset
                </Button>
              </>
            ) : null}
            <Menu anchorEl={toolbarActionsAnchorEl} open={toolbarActionsOpen} onClose={closeToolbarActionsMenu}>
              <MenuItem onClick={() => { handleCsvDownload("xls"); closeToolbarActionsMenu(); }}>Excel</MenuItem>
              <MenuItem onClick={() => { handleCsvDownload("csv"); closeToolbarActionsMenu(); }}>CSV</MenuItem>
              <MenuItem onClick={() => { openPrintableTable(false); closeToolbarActionsMenu(); }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                  <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />
                  PDF
                </Box>
              </MenuItem>
            </Menu>
        </Box>

        <DataGrid
          autoHeight
          rows={displayRows}
          columns={columns}
          disableColumnReorder
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          sortingMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          sortModel={sortModel}
          onSortModelChange={onSortModelChange}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeader[data-field='image']": {
              position: "sticky",
              left: 0,
              zIndex: 5,
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-columnHeader[data-field='serialNumber']": {
              position: "sticky",
              left: 90,
              zIndex: 5,
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-columnHeader[data-field='name']": {
              position: "sticky",
              left: 185,
              zIndex: 5,
              bgcolor: "#fff",
              boxShadow: "2px 0 0 #eef2f7",
            },
            "& .MuiDataGrid-columnHeader[data-field='actions']": {
              position: "sticky",
              right: 0,
              zIndex: 5,
              bgcolor: "#fff",
              boxShadow: "-2px 0 0 #eef2f7",
            },
            "& .MuiDataGrid-cell[data-field='image']": {
              position: "sticky",
              left: 0,
              zIndex: 3,
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-cell[data-field='serialNumber']": {
              position: "sticky",
              left: 90,
              zIndex: 3,
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-cell[data-field='name']": {
              position: "sticky",
              left: 185,
              zIndex: 3,
              bgcolor: "#fff",
              boxShadow: "2px 0 0 #eef2f7",
            },
            "& .MuiDataGrid-cell[data-field='actions']": {
              position: "sticky",
              right: 0,
              zIndex: 3,
              bgcolor: "#fff",
              boxShadow: "-2px 0 0 #eef2f7",
            },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              color: "#6b7280",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              fontWeight: 700,
            },
            "& .MuiDataGrid-row:hover": { bgcolor: "#f0fdf4" },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #eef2f7",
              alignItems: "center",
            },
            "& .MuiDataGrid-scrollbar--horizontal": {
              top: "auto",
              bottom: 0,
              zIndex: 2,
            },
            "& .MuiDataGrid-scrollbar--horizontal > div": {
              minHeight: 14,
            },
            "& .MuiDataGrid-scrollbar--horizontal > div::-webkit-scrollbar": {
              height: 14,
            },
            "& .MuiDataGrid-scrollbar--horizontal > div::-webkit-scrollbar-thumb": {
              backgroundColor: "#9ecdc8",
              borderRadius: 8,
              border: "3px solid #eef8f6",
            },
            "& .MuiDataGrid-scrollbar--horizontal > div::-webkit-scrollbar-track": {
              backgroundColor: "#dff1ee",
              borderRadius: 8,
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #e5e7eb",
            },
          }}
        />
      </Stack>
        </Box>

      <AssetDialog
        open={Boolean(dialogMode)}
        mode={dialogMode}
        form={form}
        setForm={setForm}
        onClose={() => setDialogMode(null)}
        onSubmit={handleDialogSubmit}
        employees={employees}
      />

      <Menu anchorEl={actionMenuAnchorEl} open={actionMenuOpen} onClose={closeActionMenu}>
        <MenuItem
          onClick={() => {
            const row = actionMenuRow;
            closeActionMenu();
            setSelectedAsset(row);
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 18, mr: 1, color: "#155fa0" }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            const row = actionMenuRow;
            closeActionMenu();
            openEditDialog(row);
          }}
        >
          <EditOutlinedIcon sx={{ fontSize: 18, mr: 1, color: "#173255" }} />
          Edit
        </MenuItem>
        {isAdmin && onAssign && actionMenuRow?.status === "available" && (
          <MenuItem
            onClick={() => {
              const row = actionMenuRow;
              closeActionMenu();
              openAssignDialog(row);
            }}
          >
            <PersonAddAltOutlinedIcon sx={{ fontSize: 18, mr: 1, color: "#00695c" }} />
            Add
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const row = actionMenuRow;
            closeActionMenu();
            if (row) onDelete(row.id);
          }}
        >
          <DeleteOutlineOutlinedIcon sx={{ fontSize: 18, mr: 1, color: "#dc3545" }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={imagePreview.open} onClose={() => setImagePreview({ open: false, src: "", assetTag: "", name: "" })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {imagePreview.assetTag ? `${imagePreview.assetTag}` : "Asset Image"}
          {imagePreview.name ? ` - ${imagePreview.name}` : ""}
        </DialogTitle>
        <DialogContent>
          <Box
            component="img"
            src={imagePreview.src}
            alt={imagePreview.name || "Asset"}
            sx={{
              width: "100%",
              maxHeight: 420,
              objectFit: "contain",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              bgcolor: "#f8fafc",
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreview({ open: false, src: "", assetTag: "", name: "" })}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "6px" } }}>
        <DialogTitle>Assign Employee</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Asset"
              value={displayRows.find((row) => String(row.id) === String(assignForm.assetId))?.assetTag || ""}
              fullWidth
              disabled
            />
            <TextField
              select
              label="Employee"
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, employeeId: e.target.value }))}
              fullWidth
            >
              <MenuItem value=""><em>Select employee</em></MenuItem>
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.name} {employee.department ? `(${employee.department})` : ""}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.75, fontWeight: 600 }}>
                Expected Return Date
              </Typography>
              <TextField
                type="date"
                value={assignForm.expectedReturnDate}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, expectedReturnDate: e.target.value }))}
                inputProps={{ min: minReturnDate }}
                fullWidth
              />
            </Box>
            <TextField
              label="Notes"
              multiline
              minRows={3}
              value={assignForm.notes}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
            {assignError ? <Alert severity="error">{assignError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAssignSubmit} variant="contained" sx={{ bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" } }}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Maintenance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Issue Title"
              value={requestForm.title}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              multiline
              minRows={4}
              value={requestForm.description}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Priority"
              select
              value={requestForm.priority}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, priority: e.target.value }))}
              fullWidth
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
            {requestError ? <Alert severity="error">{requestError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRequestSubmit}>
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={stockDialogOpen}
        onClose={() => { setStockDialogOpen(false); resetStockForm(); }}
        PaperProps={{ sx: { width: { xs: "100%", md: 580 }, p: 0 } }}
      >
        <Stack sx={{ height: "100%" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#f8fafc" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 22, color: "#0f172a" }}>Add Stock</Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>
            <Stack spacing={2.25}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
              <TextField
                label="Asset Name / Model"
                size="small"
                value={stockForm.name}
                onChange={(e) => setStockForm((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
                sx={stockFieldSx}
              />
              <TextField
                select
                label="Category"
                size="small"
                value={stockForm.type}
                onChange={(e) => setStockForm((prev) => ({ ...prev, type: e.target.value }))}
                fullWidth
                sx={stockFieldSx}
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
                value={stockForm.quantity}
                onChange={(e) => setStockForm((prev) => ({ ...prev, quantity: e.target.value }))}
                fullWidth
                required
                inputProps={{ min: 1, step: 1 }}
                sx={stockFieldSx}
              />
              <TextField
                label="Location"
                size="small"
                value={stockForm.location}
                onChange={(e) => setStockForm((prev) => ({ ...prev, location: e.target.value }))}
                fullWidth
                required
                sx={stockFieldSx}
              />
              <TextField
                label="Vendor / Supplier"
                size="small"
                value={stockForm.vendor}
                onChange={(e) => setStockForm((prev) => ({ ...prev, vendor: e.target.value }))}
                fullWidth
                sx={stockFieldSx}
              />
              <TextField
                label="Source"
                select
                size="small"
                value={stockForm.source}
                onChange={(e) => setStockForm((prev) => ({ ...prev, source: e.target.value }))}
                fullWidth
                sx={stockFieldSx}
              >
                {stockSourceOptions.map((option) => (
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
                  value={stockForm.purchaseDate}
                  onChange={(e) => setStockForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                  fullWidth
                  sx={stockFieldSx}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.75, fontWeight: 600 }}>
                  Warranty End Date
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  value={stockForm.warrantyExpiry}
                  onChange={(e) => setStockForm((prev) => ({ ...prev, warrantyExpiry: e.target.value }))}
                  fullWidth
                  sx={stockFieldSx}
                />
              </Box>
              <TextField
                label="Cost per unit"
                type="number"
                size="small"
                value={stockForm.unitCost}
                onChange={(e) => setStockForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                fullWidth
                inputProps={{ min: 0, step: "0.01" }}
                sx={stockFieldSx}
              />
              <TextField
                label="Default Status"
                size="small"
                value="Available"
                fullWidth
                disabled
                sx={stockFieldSx}
              />
            </Box>

            <TextField
              label="Remarks"
              size="small"
              value={stockForm.remarks}
              onChange={(e) => setStockForm((prev) => ({ ...prev, remarks: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "6px", fontSize: 14 },
                "& .MuiInputLabel-root": { fontSize: 14 },
              }}
            />

            <TextField
              label="Serial Numbers (optional, one per line)"
              size="small"
              value={stockForm.serialNumbersText}
              onChange={(e) => setStockForm((prev) => ({ ...prev, serialNumbersText: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "6px", fontSize: 14 },
                "& .MuiInputLabel-root": { fontSize: 14 },
              }}
            />

            {stockError ? <Alert severity="error">{stockError}</Alert> : null}
            </Stack>
          </Box>
          <Box sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1.5 }}>
            <Button
              onClick={() => { setStockDialogOpen(false); resetStockForm(); }}
              variant="outlined"
              sx={{ flex: 1, textTransform: "none", borderRadius: "6px", minHeight: 42, fontWeight: 600, borderColor: "#d1d5db", color: "#374151" }}
              disabled={stockSubmitBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockSubmit}
              variant="contained"
              sx={{ flex: 1, textTransform: "none", bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" }, borderRadius: "6px", minHeight: 42, fontWeight: 700 }}
              disabled={stockSubmitBusy}
            >
              {stockSubmitBusy ? "Adding..." : "Add Stock"}
            </Button>
          </Box>
        </Stack>
      </Drawer>

      <Drawer
        anchor="right"
        open={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 480 },
            maxWidth: "100vw",
            borderLeft: "1px solid #e5e7eb",
            boxShadow: "0 8px 32px rgba(15, 23, 42, 0.14)",
            bgcolor: "#fff",
            overflow: "hidden",
          },
        }}
      >
        {selectedAsset ? (
          <Stack sx={{ height: "100%" }}>
            {/* Top bar: back arrow + actions */}
            <Box sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <IconButton size="small" onClick={() => setSelectedAsset(null)} sx={{ color: "#374151", mr: 1 }}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    setForm({
                      assetTag: selectedAsset.assetTag || "",
                      name: selectedAsset.name || "",
                      specs: selectedAsset.specs || "",
                      unitPrice: selectedAsset.unitPrice || "",
                      status: selectedAsset.status || "available",
                      purchaseDate: selectedAsset.purchaseDate || "",
                      type: selectedAsset.type || "laptop",
                      subCategory: selectedAsset.subCategory || "",
                      supplier: selectedAsset.supplier || "",
                      department: selectedAsset.department || "",
                      subDepartment: selectedAsset.subDepartment || "",
                      dateOfManufacture: selectedAsset.dateOfManufacture || "",
                      warrantyExpiry: selectedAsset.warrantyExpiry || "",
                      location: selectedAsset.location || "",
                      note: selectedAsset.note || "",
                      createdDate: selectedAsset.createdDate || "",
                      assignEmployee: selectedAsset.assignedTo || "",
                    });
                    setDialogMode("edit");
                    setSelectedAsset(null);
                  }}
                  sx={{ textTransform: "none", borderColor: "#d1d5db", color: "#374151", fontWeight: 600, fontSize: 13, px: 1.5, "&:hover": { bgcolor: "#f9fafb" } }}
                >
                  Edit
                </Button>
                {(isAdmin || userRole === "it") && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      navigate(`/audit?assetId=${selectedAsset.id}`);
                      setSelectedAsset(null);
                    }}
                    sx={{ textTransform: "none", borderColor: "#d1d5db", color: "#374151", fontWeight: 600, fontSize: 13, px: 1.5, "&:hover": { bgcolor: "#f9fafb" } }}
                  >
                    Audit
                  </Button>
                )}
                {isAdmin && selectedAsset.status === "available" && onAssign && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PersonAddAltOutlinedIcon sx={{ fontSize: 15 }} />}
                    onClick={() => { openAssignDialog(selectedAsset); setSelectedAsset(null); }}
                    sx={{ textTransform: "none", bgcolor: "#00695c", "&:hover": { bgcolor: "#005047" }, fontWeight: 600, fontSize: 13, px: 1.5 }}
                  >
                    Assign
                  </Button>
                )}
              </Stack>
            </Box>

            {/* Title + Status */}
            <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 20, color: "#111827", mb: 0.75 }}>
                {selectedAsset.name}
              </Typography>
              <Chip
                size="small"
                label={selectedAsset.status ? String(selectedAsset.status).replace(/_/g, " ") : "Unknown"}
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

            {/* Details rows */}
            <Box sx={{ flex: 1, overflow: "auto" }}>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, mb: 1.5, textTransform: "uppercase" }}>
                  Asset Details
                </Typography>
                {[
                  { label: "Asset Model No", value: selectedAsset.assetTag || "-" },
                  { label: "Category", value: selectedAsset.type ? selectedAsset.type.replace(/_/g, " ") : "-", capitalize: true },
                  { label: "Assigned Employee", value: selectedAsset.assignedTo || "-" },
                  { label: "Location", value: selectedAsset.location || "-" },
                  { label: "Date Of Purchase", value: selectedAsset.purchaseDate ? String(selectedAsset.purchaseDate).slice(0, 10) : "-" },
                  { label: "Warranty Expiry", value: selectedAsset.warrantyExpiry ? String(selectedAsset.warrantyExpiry).slice(0, 10) : "-" },
                  { label: "Description", value: selectedAsset.specs || "-" },
                ].map(({ label, value, capitalize }) => (
                  <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", py: 1.4, borderBottom: "1px solid #f3f4f6" }}>
                    <Typography sx={{ fontSize: 13, color: "#6b7280", fontWeight: 500, minWidth: 150 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 600, textAlign: "right", textTransform: capitalize ? "capitalize" : "none", maxWidth: 220, wordBreak: "break-word" }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Stack>
        ) : null}
      </Drawer>
        </Stack>
      </Paper>
  );
}

