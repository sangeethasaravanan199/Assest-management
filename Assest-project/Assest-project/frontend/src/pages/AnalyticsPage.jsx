import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import KeyboardArrowRightOutlinedIcon from "@mui/icons-material/KeyboardArrowRightOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const reportCategories = [
  { key: "supplier", label: "Supplier", icon: <LocalShippingOutlinedIcon />, reportIds: ["supplier-performance"] },
  { key: "inventory", label: "Inventory", icon: <Inventory2OutlinedIcon />, reportIds: ["stock-availability", "warranty-expiry", "department-assets", "asset-utilization"] },
  { key: "purchase", label: "Purchase", icon: <PaidOutlinedIcon />, reportIds: ["cost-analysis"] },
  { key: "transactions", label: "Transactions", icon: <ReceiptLongOutlinedIcon />, reportIds: ["maintenance-summary", "asset-assignment"] },
];

const reportDefinitions = {
  "maintenance-summary": {
    id: "maintenance-summary",
    title: "Maintenance Summary Report",
    description: "Track maintenance volume, status distribution, and unresolved service work.",
    filterFields: ["timeRange", "status"],
    columns: [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value" },
    ],
  },
  "stock-availability": {
    id: "stock-availability",
    title: "Stock Availability Report",
    description: "Review available stock by type, status, and operating location.",
    filterFields: ["timeRange", "status", "department"],
    columns: [
      { key: "assetTag", label: "Asset Tag" },
      { key: "name", label: "Asset" },
      { key: "status", label: "Status" },
      { key: "location", label: "Location" },
    ],
  },
  "warranty-expiry": {
    id: "warranty-expiry",
    title: "Warranty Expiry Report",
    description: "Identify assets with upcoming or expired warranty coverage.",
    filterFields: ["timeRange", "type"],
    columns: [
      { key: "assetTag", label: "Asset Tag" },
      { key: "name", label: "Asset" },
      { key: "warrantyExpiry", label: "Warranty Expiry" },
      { key: "location", label: "Location" },
    ],
  },
  "asset-assignment": {
    id: "asset-assignment",
    title: "Asset Assignment Report",
    description: "Monitor allocated assets, owners, and unassigned inventory.",
    filterFields: ["status", "department"],
    columns: [
      { key: "assetTag", label: "Asset Tag" },
      { key: "name", label: "Asset" },
      { key: "assignedTo", label: "Assigned To" },
      { key: "department", label: "Department" },
    ],
  },
  "department-assets": {
    id: "department-assets",
    title: "Department-wise Assets Report",
    description: "Compare asset counts, assignments, and maintenance load by department.",
    filterFields: ["department", "status"],
    columns: [
      { key: "department", label: "Department" },
      { key: "assets", label: "Assets" },
      { key: "assigned", label: "Assigned" },
      { key: "maintenance", label: "Maintenance" },
    ],
  },
  "supplier-performance": {
    id: "supplier-performance",
    title: "Supplier Performance Report",
    description: "Measure supplier contribution, quantity volume, and purchase value.",
    filterFields: ["supplier", "timeRange"],
    columns: [
      { key: "supplier", label: "Supplier" },
      { key: "entries", label: "Entries" },
      { key: "totalQuantity", label: "Quantity" },
      { key: "totalValue", label: "Total Value" },
    ],
  },
  "cost-analysis": {
    id: "cost-analysis",
    title: "Cost Analysis Report",
    description: "Review supplier spend, average unit cost, and purchase volume.",
    filterFields: ["supplier", "timeRange", "type"],
    columns: [
      { key: "supplier", label: "Supplier" },
      { key: "avgUnitCost", label: "Avg Unit Cost" },
      { key: "totalValue", label: "Spend" },
      { key: "entries", label: "Purchases" },
    ],
  },
  "asset-utilization": {
    id: "asset-utilization",
    title: "Asset Utilization Report",
    description: "See how much inventory is actively in use versus idle or available.",
    filterFields: ["department", "type"],
    columns: [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value" },
    ],
  },
};

const defaultFilters = {
  timeRange: "all",
  status: "all",
  type: "all",
  department: "all",
  supplier: "all",
};

function formatType(value) {
  if (!value) return "-";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatus(value) {
  if (!value) return "-";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isWithinRange(value, timeRange) {
  if (timeRange === "all" || !value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const diffDays = Math.ceil((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (timeRange === "30") return diffDays <= 30;
  if (timeRange === "90") return diffDays <= 90;
  if (timeRange === "365") return diffDays <= 365;
  return true;
}

function ReportCard({ report, active, onOpen }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "10px",
        border: "1px solid",
        borderColor: active ? "#0d9488" : "divider",
        p: 2,
        minHeight: 170,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: active ? "0 10px 24px rgba(13,148,136,0.14)" : "0 2px 8px rgba(15,23,42,0.04)",
      }}
    >
      <Stack spacing={1.25}>
        <Chip label={report.categoryLabel} size="small" sx={{ width: "fit-content", fontWeight: 700, bgcolor: "#f0fdfa", color: "#0f766e" }} />
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>
            {report.title}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
            {report.description}
          </Typography>
        </Box>
      </Stack>
      <Button
        variant={active ? "contained" : "outlined"}
        endIcon={<KeyboardArrowRightOutlinedIcon />}
        onClick={() => onOpen(report.id)}
        sx={{
          mt: 2,
          alignSelf: "flex-start",
          textTransform: "none",
          borderRadius: "8px",
          fontWeight: 700,
          bgcolor: active ? "#0f766e" : undefined,
          "&:hover": { bgcolor: active ? "#115e59" : undefined },
        }}
      >
        Open report
      </Button>
    </Card>
  );
}

function FilterField({ label, value, onChange, options }) {
  return (
    <TextField
      select
      label={label}
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      fullWidth
      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function PreviewTable({ columns, rows }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: "10px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} sx={{ fontWeight: 700, bgcolor: "#f8fafc" }}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                No rows match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={`${index}-${columns[0]?.key || "row"}`}>
                {columns.map((column) => (
                  <TableCell key={column.key}>{row[column.key] ?? "-"}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default function AnalyticsPage() {
  const [assets, setAssets] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [hasInitializedReportSelection, setHasInitializedReportSelection] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const firstPagePromise = api.get("/assets", {
          params: { page: 1, pageSize: 100, sortField: "assetTag", sortDirection: "asc" },
        });
        const [firstPage, maintenanceRes, supplierRes] = await Promise.all([
          firstPagePromise,
          api.get("/maintenance"),
          api.get("/assets/stock-logs"),
        ]);

        let allAssets = firstPage.data.rows || [];
        const total = firstPage.data.total || allAssets.length;
        const totalPages = Math.ceil(total / 100);

        if (totalPages > 1) {
          const pageRequests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            pageRequests.push(
              api.get("/assets", {
                params: { page, pageSize: 100, sortField: "assetTag", sortDirection: "asc" },
              })
            );
          }
          const pages = await Promise.all(pageRequests);
          pages.forEach((response) => {
            allAssets = allAssets.concat(response.data.rows || []);
          });
        }

        setAssets(allAssets);
        setMaintenance(maintenanceRes.data || []);
        setSuppliers(supplierRes.data || []);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load report data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const departmentOptions = useMemo(() => {
    const items = new Set();
    assets.forEach((asset) => {
      if (asset.department) items.add(asset.department);
    });
    return Array.from(items).sort();
  }, [assets]);

  const typeOptions = useMemo(() => {
    const items = new Set();
    assets.forEach((asset) => {
      if (asset.type) items.add(asset.type);
    });
    return Array.from(items).sort();
  }, [assets]);

  const supplierOptions = useMemo(
    () => suppliers.map((item) => item.supplier).filter(Boolean).sort(),
    [suppliers]
  );

  const groupedReports = useMemo(
    () =>
      reportCategories.map((category) => ({
        ...category,
        reports: category.reportIds.map((reportId) => ({
          ...reportDefinitions[reportId],
          categoryLabel: category.label,
        })),
      })),
    []
  );

  useEffect(() => {
    if (hasInitializedReportSelection || selectedReportId) return;
    const firstReportId = groupedReports[0]?.reports[0]?.id;
    if (firstReportId) {
      setSelectedReportId(firstReportId);
      setHasInitializedReportSelection(true);
    }
  }, [groupedReports, hasInitializedReportSelection, selectedReportId]);

  const selectedReport = selectedReportId ? reportDefinitions[selectedReportId] : null;

  const filterOptions = {
    timeRange: [
      { value: "all", label: "All Time" },
      { value: "30", label: "Last 30 Days" },
      { value: "90", label: "Last 90 Days" },
      { value: "365", label: "Last 12 Months" },
    ],
    status: [
      { value: "all", label: "All Statuses" },
      { value: "available", label: "Available" },
      { value: "assigned", label: "Assigned" },
      { value: "maintenance", label: "Maintenance" },
      { value: "retired", label: "Retired" },
      { value: "open", label: "Open" },
      { value: "in_progress", label: "In Progress" },
      { value: "resolved", label: "Resolved" },
    ],
    type: [{ value: "all", label: "All Types" }, ...typeOptions.map((item) => ({ value: item, label: formatType(item) }))],
    department: [{ value: "all", label: "All Departments" }, ...departmentOptions.map((item) => ({ value: item, label: item }))],
    supplier: [{ value: "all", label: "All Suppliers" }, ...supplierOptions.map((item) => ({ value: item, label: item }))],
  };

  const previewData = useMemo(() => {
    if (!selectedReport) {
      return { rows: [], summary: [] };
    }

    const scopedAssets = assets.filter((asset) => {
      if (filters.status !== "all" && asset.status !== filters.status) return false;
      if (filters.type !== "all" && asset.type !== filters.type) return false;
      if (filters.department !== "all" && (asset.department || "Unassigned") !== filters.department) return false;
      return true;
    });

    const scopedSuppliers = suppliers.filter((item) => {
      if (filters.supplier !== "all" && item.supplier !== filters.supplier) return false;
      if (!isWithinRange(item.lastAddedAt, filters.timeRange)) return false;
      return true;
    });

    const scopedMaintenance = maintenance.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) return false;
      if (!isWithinRange(item.createdAt || item.created_at, filters.timeRange)) return false;
      return true;
    });

    if (selectedReport.id === "maintenance-summary") {
      const openCount = scopedMaintenance.filter((item) => item.status === "open").length;
      const inProgressCount = scopedMaintenance.filter((item) => item.status === "in_progress").length;
      const resolvedCount = scopedMaintenance.filter((item) => item.status === "resolved").length;
      return {
        rows: [
          { metric: "Total Requests", value: scopedMaintenance.length },
          { metric: "Open", value: openCount },
          { metric: "In Progress", value: inProgressCount },
          { metric: "Resolved", value: resolvedCount },
        ],
        summary: [
          { label: "Requests", value: scopedMaintenance.length },
          { label: "Open workload", value: openCount + inProgressCount },
        ],
      };
    }

    if (selectedReport.id === "stock-availability") {
      return {
        rows: scopedAssets.slice(0, 8).map((asset) => ({
          assetTag: asset.assetTag || asset.id,
          name: asset.name || "-",
          status: formatStatus(asset.status),
          location: asset.location || "-",
        })),
        summary: [
          { label: "Visible assets", value: scopedAssets.length },
          { label: "Available", value: scopedAssets.filter((asset) => asset.status === "available").length },
        ],
      };
    }

    if (selectedReport.id === "warranty-expiry") {
      const rows = scopedAssets
        .filter((asset) => asset.warrantyExpiry && isWithinRange(asset.warrantyExpiry, filters.timeRange === "all" ? "365" : filters.timeRange))
        .sort((a, b) => String(a.warrantyExpiry).localeCompare(String(b.warrantyExpiry)))
        .slice(0, 8)
        .map((asset) => ({
          assetTag: asset.assetTag || asset.id,
          name: asset.name || "-",
          warrantyExpiry: formatDate(asset.warrantyExpiry),
          location: asset.location || "-",
        }));
      return {
        rows,
        summary: [
          { label: "Upcoming expiries", value: rows.length },
          { label: "Filtered assets", value: scopedAssets.length },
        ],
      };
    }

    if (selectedReport.id === "asset-assignment") {
      return {
        rows: scopedAssets.slice(0, 8).map((asset) => ({
          assetTag: asset.assetTag || asset.id,
          name: asset.name || "-",
          assignedTo: asset.assignedTo || "Unassigned",
          department: asset.department || "Unassigned",
        })),
        summary: [
          { label: "Assigned", value: scopedAssets.filter((asset) => asset.assignedTo).length },
          { label: "Unassigned", value: scopedAssets.filter((asset) => !asset.assignedTo).length },
        ],
      };
    }

    if (selectedReport.id === "department-assets") {
      const byDepartment = scopedAssets.reduce((acc, asset) => {
        const key = asset.department || "Unassigned";
        if (!acc[key]) {
          acc[key] = { department: key, assets: 0, assigned: 0, maintenance: 0 };
        }
        acc[key].assets += 1;
        if (asset.assignedTo) acc[key].assigned += 1;
        if (asset.status === "maintenance") acc[key].maintenance += 1;
        return acc;
      }, {});
      return {
        rows: Object.values(byDepartment).sort((a, b) => b.assets - a.assets).slice(0, 8),
        summary: [
          { label: "Departments", value: Object.keys(byDepartment).length },
          { label: "Total assets", value: scopedAssets.length },
        ],
      };
    }

    if (selectedReport.id === "supplier-performance") {
      return {
        rows: scopedSuppliers.slice(0, 8).map((item) => ({
          supplier: item.supplier || "Unknown",
          entries: item.entries || 0,
          totalQuantity: item.totalQuantity || 0,
          totalValue: formatCurrency(item.totalValue),
        })),
        summary: [
          { label: "Suppliers", value: scopedSuppliers.length },
          { label: "Purchase value", value: formatCurrency(scopedSuppliers.reduce((sum, item) => sum + Number(item.totalValue || 0), 0)) },
        ],
      };
    }

    if (selectedReport.id === "cost-analysis") {
      return {
        rows: scopedSuppliers.slice(0, 8).map((item) => ({
          supplier: item.supplier || "Unknown",
          avgUnitCost: formatCurrency(item.entries ? Number(item.totalValue || 0) / Number(item.entries) : 0),
          totalValue: formatCurrency(item.totalValue),
          entries: item.entries || 0,
        })),
        summary: [
          { label: "Spend", value: formatCurrency(scopedSuppliers.reduce((sum, item) => sum + Number(item.totalValue || 0), 0)) },
          { label: "Purchase entries", value: scopedSuppliers.reduce((sum, item) => sum + Number(item.entries || 0), 0) },
        ],
      };
    }

    const active = scopedAssets.filter((asset) => asset.assignedTo).length;
    const available = scopedAssets.filter((asset) => asset.status === "available").length;
    return {
      rows: [
        { metric: "Total Inventory", value: scopedAssets.length },
        { metric: "Assigned / In Use", value: active },
        { metric: "Available / Idle", value: available },
        { metric: "Utilization Rate", value: scopedAssets.length ? `${Math.round((active / scopedAssets.length) * 100)}%` : "0%" },
      ],
      summary: [
        { label: "Active assets", value: active },
        { label: "Idle assets", value: available },
      ],
    };
  }, [assets, filters, maintenance, selectedReport, suppliers]);

  const selectedColumns = selectedReport ? selectedReport.columns : [];

  const openReport = (reportId) => {
    setSelectedReportId(reportId);
    setFilters(defaultFilters);
  };

  return (
    <Stack spacing={2.5}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "10px",
          border: "1px solid",
          borderColor: "divider",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography sx={{ fontSize: { xs: 28, md: 30 }, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
              Reports Workspace
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 15, color: "#64748b", maxWidth: 680 }}>
              Open supplier, inventory, purchase, and transaction reports from one workspace. Each report opens in a side panel with filters, preview rows, and print actions.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignSelf: { xs: "flex-start", md: "flex-start" }, ml: { md: "auto" } }}>
            <Chip
              icon={<InsightsOutlinedIcon />}
              label={loading ? "Refreshing data" : `${assets.length} assets indexed`}
              sx={{ alignSelf: "flex-start", fontWeight: 700, bgcolor: "#ecfeff", color: "#155e75" }}
            />
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        {groupedReports.map((category) => (
          <Paper key={category.key} elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
              <Box sx={{ width: 42, height: 42, borderRadius: "10px", display: "grid", placeItems: "center", bgcolor: "#f0fdfa", color: "#0f766e" }}>
                {category.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{category.label}</Typography>
                <Typography sx={{ fontSize: 13, color: "#64748b" }}>{category.reports.length} reports</Typography>
              </Box>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 2,
              }}
            >
              {category.reports.map((report) => (
                <ReportCard key={report.id} report={report} active={selectedReportId === report.id} onOpen={openReport} />
              ))}
            </Box>
          </Paper>
        ))}
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(selectedReport)}
        onClose={() => setSelectedReportId(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: 520 } } }}
      >
        {selectedReport ? (
          <Stack sx={{ height: "100%" }}>
            <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#f8fafc" }}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{selectedReport.title}</Typography>
                  <Typography sx={{ mt: 1, fontSize: 14, color: "#64748b" }}>{selectedReport.description}</Typography>
                </Box>
                <Button onClick={() => setSelectedReportId(null)} sx={{ minWidth: 0, px: 1.25, alignSelf: "flex-start" }}>
                  Close
                </Button>
              </Stack>
            </Box>

            <Stack spacing={2.5} sx={{ p: 3, overflowY: "auto" }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <TuneOutlinedIcon sx={{ color: "#0f766e", fontSize: 20 }} />
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Filters</Typography>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
                  {selectedReport.filterFields.map((field) => (
                    <FilterField
                      key={field}
                      label={field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}
                      value={filters[field]}
                      onChange={(value) => setFilters((prev) => ({ ...prev, [field]: value }))}
                      options={filterOptions[field]}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a", mb: 1.5 }}>Actions</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<AssessmentOutlinedIcon />}
                    onClick={() => window.print()}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                  >
                    Print Preview
                  </Button>
                </Stack>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a", mb: 1.5 }}>Preview summary</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
                  {previewData.summary.map((item) => (
                    <Paper key={item.label} elevation={0} sx={{ p: 2, borderRadius: "10px", border: "1px solid", borderColor: "divider" }}>
                      <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{item.label}</Typography>
                      <Typography sx={{ mt: 0.75, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{item.value}</Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>

              <Divider />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VisibilityOutlinedIcon sx={{ color: "#0f766e", fontSize: 20 }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Report preview</Typography>
                  </Stack>
                  <Chip label={`${previewData.rows.length} rows`} size="small" sx={{ fontWeight: 700 }} />
                </Stack>
                <PreviewTable columns={selectedColumns} rows={previewData.rows} />
              </Box>
            </Stack>
          </Stack>
        ) : null}
      </Drawer>
    </Stack>
  );
}
