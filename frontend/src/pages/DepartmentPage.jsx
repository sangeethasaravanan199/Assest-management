import AddIcon from "@mui/icons-material/Add";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector, GridToolbarExport, GridToolbarFilterButton } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import api from "../api/client";

const STORAGE_KEY = "asset-departments";

const defaultDepartments = [
  { id: 1, name: "Information Technology", description: "Handles all IT infrastructure and software" },
  { id: 2, name: "Human Resources", description: "Employee recruitment, welfare and records" },
  { id: 3, name: "Finance", description: "Manages budgets, accounts and financial reporting" },
  { id: 4, name: "Operations", description: "Day-to-day business operations and logistics" },
  { id: 5, name: "Marketing", description: "Brand, promotions and digital marketing" },
  { id: 6, name: "Engineering", description: "Product engineering, development, and technical delivery" },
  { id: 7, name: "Sales", description: "Lead generation, client outreach, and revenue growth" },
  { id: 8, name: "Customer Support", description: "Customer issue resolution and service desk operations" },
  { id: 9, name: "Procurement", description: "Vendor sourcing, purchasing, and supply coordination" },
  { id: 10, name: "IT Operations", description: "Core admin systems, access control, and infrastructure operations" },
];

function mergeDepartments(savedRows = []) {
  const byName = new Map(savedRows.map((row) => [row.name, row]));
  const merged = [...savedRows];

  defaultDepartments.forEach((department) => {
    if (!byName.has(department.name)) {
      merged.push({ ...department, id: merged.length ? Math.max(...merged.map((row) => row.id)) + 1 : department.id });
    }
  });

  return merged;
}

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

const emptyForm = { name: "", description: "" };

export default function DepartmentPage() {
  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? mergeDepartments(JSON.parse(saved)) : defaultDepartments;
    } catch {
      return defaultDepartments;
    }
  });

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);
  const dialogFieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "6px", minHeight: 48, fontSize: 14 },
    "& .MuiInputLabel-root": { fontSize: 14 },
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    api.get("/users").then(({ data }) => setEmployees(data)).catch(() => setEmployees([]));
  }, []);

  // Count employees per department from real API data
  const empCountByDept = useMemo(() => {
    return employees.reduce((acc, emp) => {
      if (emp.department) acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {});
  }, [employees]);

  const totalEmployees = employees.length;

  const filtered = rows
    .filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    )
    .map((r) => ({ ...r, employeeCount: empCountByDept[r.name] || 0 }));

  const openAdd = () => {
    setEditRow(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({ name: row.name, description: row.description });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editRow) {
      setRows((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, ...form } : r)));
    } else {
      const newId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
      setRows((prev) => [...prev, { id: newId, ...form }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
  };

  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuRow(null);
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Department Name", flex: 1, minWidth: 180 },
    { field: "description", headerName: "Description", flex: 2, minWidth: 250 },
    {
      field: "employeeCount",
      headerName: "Employee Count",
      width: 150,
      renderCell: ({ value }) => (
        <Chip label={value} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
    {
      field: "actions",
      headerName: "Action",
      width: 120,
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
  ];

  const summaryCards = [
    { label: "Total Departments", value: rows.length, icon: <ApartmentOutlinedIcon />, color: "#0f766e" },
    { label: "Total Employees", value: totalEmployees, icon: <GroupsOutlinedIcon />, color: "#155fa0" },
  ];

  return (
    <Stack spacing={2.5}>
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
              Department
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
            placeholder="Search departments..."
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
            startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{
              minWidth: 160,
              height: 46,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "6px",
              bgcolor: "#00695c",
              boxShadow: "none",
              flexShrink: 0,
              "&:hover": { bgcolor: "#004d40", boxShadow: "none" },
            }}
          >
            Add Department
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Card elevation={2} sx={{ borderRadius: "6px" }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{ toolbar: CustomToolbar }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": { bgcolor: "#f0faf9", fontWeight: 700 },
            "& .MuiDataGrid-row:hover": { bgcolor: "#f0faf9" },
          }}
        />
      </Card>

      <Menu anchorEl={actionMenuAnchorEl} open={Boolean(actionMenuAnchorEl)} onClose={closeActionMenu}>
        <MenuItem onClick={() => {
          if (actionMenuRow) {
            openEdit(actionMenuRow);
          }
          closeActionMenu();
        }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <EditOutlinedIcon fontSize="small" sx={{ color: "#1565c0" }} />
            Edit
          </Box>
        </MenuItem>
        <MenuItem onClick={() => {
          if (actionMenuRow) {
            setDeleteConfirm(actionMenuRow);
          }
          closeActionMenu();
        }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <DeleteOutlineIcon fontSize="small" sx={{ color: "#c62828" }} />
            Delete
          </Box>
        </MenuItem>
      </Menu>

      {/* Add / Edit Side Panel */}
      <Drawer
        anchor="right"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 540 }, p: 0 } }}
      >
        <Stack sx={{ height: "100%" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#f8fafc" }}>
            <Typography sx={{ fontWeight: 700, color: "#0f766e", fontSize: 28, pb: 0.5 }}>
              {editRow ? "Edit Department" : "Add Department"}
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ p: 2.5, overflowY: "auto" }}>
            <TextField
              label="Department Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
              sx={dialogFieldSx}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "6px", fontSize: 14 },
                "& .MuiInputLabel-root": { fontSize: 14 },
              }}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: "auto", p: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" color="inherit" sx={{ textTransform: "none", borderRadius: "6px", minHeight: 40, minWidth: 100, fontWeight: 600 }}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" sx={{ bgcolor: "#00695c", "&:hover": { bgcolor: "#004d40" }, textTransform: "none", borderRadius: "6px", minHeight: 40, minWidth: 120, fontWeight: 700 }}>
              {editRow ? "Update" : "Save"}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={() => handleDelete(deleteConfirm.id)} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
