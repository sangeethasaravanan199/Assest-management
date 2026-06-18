import { useEffect, useMemo, useState } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LaptopOutlinedIcon from "@mui/icons-material/LaptopOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import DevicesOtherOutlinedIcon from "@mui/icons-material/DevicesOtherOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import EmployeeAssetView from "../components/EmployeeAssetView";

const defaultForm = {
  name: "",
  email: "",
  password: "",
  department: "",
  role: "employee",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [lastNotifiedOpenCount, setLastNotifiedOpenCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAssets, setUserAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  useEffect(() => {
    if (!selectedUser) { setUserAssets([]); return; }
    setAssetsLoading(true);
    api.get(`/assets/assignments?employeeId=${selectedUser.id}`)
      .then(({ data }) => setUserAssets(data))
      .catch(() => setUserAssets([]))
      .finally(() => setAssetsLoading(false));
  }, [selectedUser?.id]);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setRows(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function loadMaintenanceNotifications() {
    if (String(user?.role || "").toLowerCase() !== "admin") return;
    try {
      const { data } = await api.get("/maintenance");
      setMaintenanceRequests(Array.isArray(data) ? data : []);
      setMaintenanceError("");
    } catch (err) {
      setMaintenanceError(err.response?.data?.message || "Failed to load maintenance notifications");
    }
  }

  useEffect(() => {
    loadUsers();
    loadMaintenanceNotifications();
  }, [user?.role]);

  async function handleCreate() {
    setMessage("");
    setError("");
    try {
      await api.post("/users", form);
      setOpen(false);
      setForm(defaultForm);
      setMessage("User created successfully.");
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    }
  }

  async function handleDelete(id) {
    setMessage("");
    setError("");
    try {
      await api.delete(`/users/${id}`);
      setMessage("User deleted successfully.");
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  }

  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuRow(null);
  };

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 80 },
      {
        field: "name",
        headerName: "Name",
        flex: 1.1,
        minWidth: 180,
        renderCell: ({ row, value }) => (
          <Typography
            component="button"
            type="button"
            onClick={() => setSelectedUser(row)}
            sx={{
              border: "none",
              background: "transparent",
              p: 0,
              m: 0,
              color: "#00695c",
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {value}
          </Typography>
        ),
      },
      { field: "email", headerName: "Email", flex: 1.4, minWidth: 220 },
      {
        field: "role",
        headerName: "Role",
        minWidth: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            color={params.value === "admin" ? "secondary" : "default"}
            variant="outlined"
          />
        ),
      },
      { field: "department", headerName: "Department", flex: 1, minWidth: 160 },
      {
        field: "createdAt",
        headerName: "Created",
        minWidth: 130,
        valueFormatter: (value) => (value ? String(value).slice(0, 10) : "-"),
      },
      {
        field: "_actions",
        headerName: "Actions",
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => (
          <IconButton
            size="small"
            onClick={(e) => { setActionMenuAnchorEl(e.currentTarget); setActionMenuRow(row); }}
            sx={{
              border: "1px solid #cbd5e1",
              color: "#475569",
              bgcolor: "#fff",
              "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
            }}
          >
            <MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ),
      },
    ],
    [user?.id]
  );

  const totalAdmins = rows.filter((r) => r.role === "admin").length;
  const totalEmployees = rows.filter((r) => r.role === "employee").length;
  const employeeRows = rows.filter((r) => r.role === "employee");

  const filteredRows = rows.filter(
    (r) =>
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase())
  );

  const openMaintenanceRequests = useMemo(
    () => maintenanceRequests.filter((item) => String(item.status || "").toLowerCase() !== "resolved"),
    [maintenanceRequests]
  );

  const criticalMaintenanceRequests = useMemo(
    () => openMaintenanceRequests.filter((item) => String(item.priority || "").toLowerCase() === "high"),
    [openMaintenanceRequests]
  );

  useEffect(() => {
    const isAdmin = String(user?.role || "").toLowerCase() === "admin";
    const openCount = openMaintenanceRequests.length;
    if (!isAdmin || openCount <= 0) return;
    if (openCount !== lastNotifiedOpenCount) {
      setNotificationOpen(true);
      setLastNotifiedOpenCount(openCount);
    }
  }, [user?.role, openMaintenanceRequests, lastNotifiedOpenCount]);

  const summaryCards = [
    { label: "Total Users", value: rows.length, icon: <PeopleAltOutlinedIcon />, color: "#0f766e" },
    { label: "Admins", value: totalAdmins, icon: <AdminPanelSettingsOutlinedIcon />, color: "#7c3aed" },
    { label: "Employees", value: totalEmployees, icon: <BadgeOutlinedIcon />, color: "#155fa0" },
  ];

  const dialogFieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "6px", minHeight: 48, fontSize: 14 },
    "& .MuiInputLabel-root": { fontSize: 14 },
  };

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Paper
        sx={{
          p: 2.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "6px",
          boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ width: "100%" }}
        >
          <Box sx={{ flex: { md: 1 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              User Management
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#6b7280", fontSize: 15 }}>
              Dashboard / Manage
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card elevation={2} sx={{ borderRadius: "6px", borderLeft: `5px solid ${card.color}` }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{card.label}</Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#000000", lineHeight: 1.2 }}>{card.value}</Typography>
                  </Box>
                  <Box sx={{ color: card.color, opacity: 0.7, fontSize: 40 }}>{card.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {message ? <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert> : null}
      {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}
      {maintenanceError ? <Alert severity="warning" onClose={() => setMaintenanceError("")}>{maintenanceError}</Alert> : null}

      {String(user?.role || "").toLowerCase() === "admin" && openMaintenanceRequests.length > 0 ? (
        <Card elevation={0} sx={{ borderRadius: "6px", border: "1px solid #fde68a", bgcolor: "#fffbeb" }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#92400e" }}>
                  Maintenance Notifications
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#78350f", mt: 0.4 }}>
                  {openMaintenanceRequests.length} open request(s) from employees
                  {criticalMaintenanceRequests.length > 0 ? `, including ${criticalMaintenanceRequests.length} high-priority` : ""}.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate("/maintenance")}
                sx={{
                  borderRadius: "6px",
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#00695c",
                  "&:hover": { bgcolor: "#004d40" },
                }}
              >
                View Maintenance Requests
              </Button>
            </Stack>
            <Stack spacing={0.75} sx={{ mt: 1.5 }}>
              {openMaintenanceRequests.slice(0, 3).map((item) => (
                <Typography key={item.id} sx={{ fontSize: 12.5, color: "#7c2d12" }}>
                  {item.assetTag} - {item.title} ({item.requestedBy})
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Snackbar
        open={notificationOpen}
        autoHideDuration={5000}
        onClose={() => setNotificationOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotificationOpen(false)}
          severity="warning"
          variant="filled"
          sx={{ width: "100%", alignItems: "center" }}
          action={
            <Stack direction="row" spacing={0.75}>
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setNotificationOpen(false);
                  navigate("/maintenance");
                }}
                sx={{ fontWeight: 700, textTransform: "none", minWidth: 0 }}
              >
                Open
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={() => setNotificationOpen(false)}
                sx={{ fontWeight: 700, textTransform: "none", minWidth: 0 }}
              >
                Close
              </Button>
            </Stack>
          }
        >
          {openMaintenanceRequests.length} maintenance request(s) need admin attention.
        </Alert>
      </Snackbar>

      {/* Search + Add toolbar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          p: 1.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "6px",
          bgcolor: "#fff",
          width: "100%",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto", width: "100%", maxWidth: 560 }}>
          <TextField
            size="small"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: 0,
              flex: "1 1 auto",
              "& .MuiOutlinedInput-root": { borderRadius: "6px", height: 40, fontSize: 14 },
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => { setForm(defaultForm); setOpen(true); }}
            sx={{
              height: 40,
              borderRadius: "6px",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              whiteSpace: "nowrap",
              bgcolor: "#00695c",
              "&:hover": { bgcolor: "#004d40", boxShadow: "none" },
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Card elevation={0} sx={{ borderRadius: "6px", border: "1px solid", borderColor: "divider" }}>
        <DataGrid
          autoHeight
          rows={filteredRows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8f9fa", fontWeight: 700 },
            "& .MuiDataGrid-row:hover": { bgcolor: "rgba(0,105,92,0.04)" },
            "& .MuiDataGrid-row.Mui-selected": { bgcolor: "rgba(0,105,92,0.08)" },
            "& .MuiDataGrid-row.Mui-selected:hover": { bgcolor: "rgba(0,105,92,0.12)" },
          }}
        />
      </Card>

      {/* 3-dots action menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
        PaperProps={{ sx: { borderRadius: "6px", minWidth: 140, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" } }}
      >
        <MenuItem
          onClick={() => { setSelectedUser(actionMenuRow); closeActionMenu(); }}
          sx={{ fontSize: 14, gap: 1.5 }}
        >
          <ManageAccountsOutlinedIcon fontSize="small" sx={{ color: "#00695c" }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => { handleDelete(actionMenuRow?.id); closeActionMenu(); }}
          disabled={Number(actionMenuRow?.id) === Number(user?.id)}
          sx={{ fontSize: 14, gap: 1.5, color: "error.main" }}
        >
          <DeleteOutlineOutlinedIcon fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      <EmployeeAssetView employees={employeeRows} />

      {/* Add User Side Panel */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 0 } }}
      >
        <Stack sx={{ height: "100%" }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #00695c 0%, #00897b 100%)",
              px: 3,
              py: 2.5,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
                <AddOutlinedIcon sx={{ color: "#fff", fontSize: 22 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}>
                  Add New User
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                  Create an employee or admin account
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={2.5} sx={{ p: 3, overflowY: "auto" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Full Name"
                size="small"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                sx={dialogFieldSx}
              />
              <TextField
                select
                label="Department"
                size="small"
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                fullWidth
                sx={dialogFieldSx}
              >
                {(() => {
                  try {
                    const saved = localStorage.getItem("asset-departments");
                    if (saved) return JSON.parse(saved).map((d) => d.name);
                  } catch {}
                  return ["Information Technology", "Human Resources", "Finance", "Operations", "Marketing"];
                })().map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Email Address"
              type="email"
              size="small"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
              sx={dialogFieldSx}
            />
            <TextField
              label="Password"
              type="password"
              size="small"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              fullWidth
              sx={dialogFieldSx}
            />
            <TextField
              label="Role"
              select
              size="small"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              fullWidth
              sx={dialogFieldSx}
            >
              <MenuItem value="employee">Employee</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </Stack>

          <Divider />
          <Stack direction="row" spacing={1} sx={{ mt: "auto", px: 3, py: 2 }}>
            <Button onClick={() => setOpen(false)} variant="outlined" sx={{ textTransform: "none", color: "text.secondary", borderRadius: "6px", minHeight: 40, minWidth: 100, fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "6px",
                minHeight: 40,
                minWidth: 140,
                bgcolor: "#00695c",
                "&:hover": { bgcolor: "#004d40" },
                boxShadow: "none",
                px: 2.5,
              }}
            >
              Create User
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      {/* User Details Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 400 },
            maxWidth: "100vw",
            overflow: "hidden",
          },
        }}
      >
        {selectedUser && (
          <Stack sx={{ height: "100%" }}>
            {/* Top bar: X left, Edit right */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <IconButton size="small" onClick={() => setSelectedUser(null)}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
              <Button
                size="small"
                startIcon={<EditOutlinedIcon fontSize="small" />}
                onClick={() => {
                  setForm({
                    name: selectedUser.name || "",
                    email: selectedUser.email || "",
                    password: "",
                    department: selectedUser.department || "",
                    role: selectedUser.role || "employee",
                  });
                  setSelectedUser(null);
                  setOpen(true);
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  px: 1.5,
                  fontSize: 13,
                  "&:hover": { bgcolor: "#f9fafb" },
                }}
              >
                Edit
              </Button>
            </Stack>

            {/* Scrollable body */}
            <Stack spacing={0} sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>
              {/* Name + role chip */}
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                {selectedUser.name}
              </Typography>
              <Chip
                size="small"
                label={selectedUser.role === "admin" ? "Admin" : "Employee"}
                variant="outlined"
                sx={{ mt: 1, alignSelf: "flex-start", fontWeight: 600, fontSize: 12 }}
              />

              {/* EMPLOYEE DETAILS section */}
              <Typography
                sx={{ mt: 2.5, mb: 1.5, fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1 }}
              >
                EMPLOYEE DETAILS
              </Typography>

              {[
                { label: "User ID", value: `${selectedUser.id}` },
                { label: "Email", value: selectedUser.email },
                { label: "Department", value: selectedUser.department || "-" },
                { label: "Role", value: selectedUser.role === "admin" ? "Administrator" : "Employee" },
                { label: "Account Created", value: selectedUser.createdAt ? String(selectedUser.createdAt).slice(0, 10) : "-" },
              ].map(({ label, value }) => (
                <Box key={label}>
                  <Box sx={{ display: "flex", alignItems: "center", py: 1.6, gap: 2 }}>
                    <Typography sx={{ fontSize: 13, color: "#6b7280", minWidth: 130 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {value}
                    </Typography>
                  </Box>
                  <Divider />
                </Box>
              ))}

              {/* ASSIGNED ASSETS section */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2.5, mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1 }}>
                  ASSIGNED ASSETS
                </Typography>
                <Chip
                  size="small"
                  label={assetsLoading ? "…" : userAssets.filter(a => !a.returnedAt).length}
                  sx={{ bgcolor: "rgba(0,105,92,0.1)", fontWeight: 700, fontSize: 11, height: 20 }}
                />
              </Stack>

              {assetsLoading ? (
                <Stack alignItems="center" sx={{ py: 3 }}>
                  <CircularProgress size={22} sx={{ color: "#00695c" }} />
                </Stack>
              ) : userAssets.filter(a => !a.returnedAt).length === 0 ? (
                <Box sx={{ py: 2.5, textAlign: "center", bgcolor: "#f9fafb", borderRadius: "6px", border: "1px dashed #e5e7eb" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>No active assets assigned</Typography>
                </Box>
              ) : (
                <Stack spacing={1.25}>
                  {userAssets.filter(a => !a.returnedAt).map((asset) => (
                    <Box key={asset.id} sx={{ px: 1.75, py: 1.5, borderRadius: "6px", border: "1px solid #e5e7eb", bgcolor: "#fafafa" }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 34, height: 34, bgcolor: "rgba(0,105,92,0.1)", flexShrink: 0 }}>
                          {asset.assetType === "laptop" ? (
                            <LaptopOutlinedIcon sx={{ fontSize: 16, color: "#00695c" }} />
                          ) : asset.assetType === "desktop" ? (
                            <DesktopWindowsOutlinedIcon sx={{ fontSize: 16, color: "#00695c" }} />
                          ) : (
                            <DevicesOtherOutlinedIcon sx={{ fontSize: 16, color: "#00695c" }} />
                          )}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {asset.assetName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{asset.assetTag}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Past assignments */}
              {userAssets.filter(a => a.returnedAt).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, mb: 1 }}>
                    PAST ASSIGNMENTS ({userAssets.filter(a => a.returnedAt).length})
                  </Typography>
                  <Stack spacing={1}>
                    {userAssets.filter(a => a.returnedAt).map((asset) => (
                      <Stack key={asset.id} direction="row" spacing={1.25} alignItems="center"
                        sx={{ px: 1.5, py: 1.2, borderRadius: "6px", bgcolor: "#f3f4f6", opacity: 0.75 }}
                      >
                        <DevicesOtherOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {asset.assetName} · {asset.assetTag}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            Returned: {String(asset.returnedAt).slice(0, 10)}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>

            {/* Footer: Delete */}
            {Number(selectedUser.id) !== Number(user?.id) && (
              <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineOutlinedIcon />}
                  onClick={() => { handleDelete(selectedUser.id); setSelectedUser(null); }}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: "6px", minHeight: 42 }}
                >
                  Delete User
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
