import {
  Alert,
  Box,
  Chip,
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

const statusDefinitions = [
  { key: "available", label: "Available" },
  { key: "in-use", label: "In Use" },
  { key: "under-maintenance", label: "Under Maintenance" },
  { key: "damaged", label: "Damaged" },
  { key: "lost", label: "Lost" },
  { key: "retired", label: "Retired" },
];

const defaultDepartmentOptions = [
  "Information Technology",
  "Human Resources",
  "Finance",
  "Operations",
  "Marketing",
  "Sales",
];

function formatType(value) {
  if (!value) return "-";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function normalizeStatus(status) {
  switch (status) {
    case "assigned":
      return "in-use";
    case "maintenance":
      return "under-maintenance";
    case "damaged":
      return "damaged";
    case "lost":
      return "lost";
    case "retired":
      return "retired";
    case "available":
    default:
      return "available";
  }
}

function statusMeta(status) {
  return statusDefinitions.find((item) => item.key === normalizeStatus(status)) || statusDefinitions[0];
}

export default function AssetStatusPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    department: "",
  });

  useEffect(() => {
    async function loadAssets() {
      setLoading(true);
      try {
        const firstPage = await api.get("/assets", {
          params: { page: 1, pageSize: 100, sortField: "assetTag", sortDirection: "asc" },
        });

        let allRows = firstPage.data.rows || [];
        const total = firstPage.data.total || allRows.length;
        const totalPages = Math.ceil(total / 100);

        if (totalPages > 1) {
          const requests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            requests.push(
              api.get("/assets", {
                params: { page, pageSize: 100, sortField: "assetTag", sortDirection: "asc" },
              })
            );
          }

          const pages = await Promise.all(requests);
          pages.forEach((response) => {
            allRows = allRows.concat(response.data.rows || []);
          });
        }

        setAssets(allRows);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load asset status data");
      } finally {
        setLoading(false);
      }
    }

    loadAssets();
  }, []);

  const categoryOptions = useMemo(() => {
    const items = new Set();
    assets.forEach((asset) => {
      if (asset.type) items.add(asset.type);
    });
    return Array.from(items).sort();
  }, [assets]);

  const departmentOptions = useMemo(() => {
    const items = new Set(defaultDepartmentOptions);
    assets.forEach((asset) => {
      if (asset.department) items.add(asset.department);
    });
    return Array.from(items).sort();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return assets.filter((asset) => {
      const mappedStatus = normalizeStatus(asset.status);
      if (filters.status && mappedStatus !== filters.status) return false;
      if (filters.category && asset.type !== filters.category) return false;
      if (filters.department && (asset.department || "") !== filters.department) return false;

      if (!query) return true;

      const haystack = [
        asset.name,
        asset.assetTag,
        asset.type,
        asset.assignedTo,
        asset.location,
        asset.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [assets, filters]);

  const summary = useMemo(() => {
    const counts = Object.fromEntries(statusDefinitions.map((item) => [item.key, 0]));
    filteredAssets.forEach((asset) => {
      counts[normalizeStatus(asset.status)] += 1;
    });
    return counts;
  }, [filteredAssets]);

  const summaryCards = statusDefinitions.map((item) => ({
    ...item,
    value: summary[item.key],
  }));

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Asset Status
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#6b7280", fontSize: 15 }}>
              Dashboard / Manage
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            lg: `repeat(${summaryCards.length}, minmax(0, 1fr))`,
          },
          gap: 1.5,
        }}
      >
        {summaryCards.map((card) => (
          <Paper
            key={card.key}
            sx={{
              p: 2,
              borderRadius: "6px",
              border: "1px solid",
              borderColor: "divider",
              minHeight: 104,
            }}
          >
            <Stack spacing={1}>
              <Chip label={card.label} variant="outlined" sx={{ width: "fit-content", fontWeight: 600 }} />
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#000000", lineHeight: 1.2 }}>
                {card.value}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Paper
        sx={{
          p: 2,
          borderRadius: "6px",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1.5}
          alignItems={{ lg: "center" }}
        >
          <TextField
            label="Search Assets"
            size="small"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            sx={{ minWidth: { xs: "100%", lg: 260 }, "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          />
          <TextField
            select
            label="Status"
            size="small"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 180 }, "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {statusDefinitions.map((option) => (
              <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Category"
            size="small"
            value={filters.category}
            onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 180 }, "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categoryOptions.map((option) => (
              <MenuItem key={option} value={option}>{formatType(option)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Department"
            size="small"
            value={filters.department}
            onChange={(event) => setFilters((prev) => ({ ...prev, department: event.target.value }))}
            sx={{ minWidth: { xs: "100%", md: 220 }, "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          >
            <MenuItem value="">All Departments</MenuItem>
            {departmentOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Paper sx={{ overflow: "hidden", borderRadius: "6px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Asset Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Asset ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Current Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Assigned Employee</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Last Updated Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAssets.map((asset) => {
              const meta = statusMeta(asset.status);
              return (
                <TableRow key={asset.id} hover>
                  <TableCell>{asset.name || "-"}</TableCell>
                  <TableCell>{asset.assetTag || asset.id || "-"}</TableCell>
                  <TableCell>{formatType(asset.type)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={meta.label} variant="outlined" />
                  </TableCell>
                  <TableCell>{asset.assignedTo || "-"}</TableCell>
                  <TableCell>{asset.location || "-"}</TableCell>
                  <TableCell>{asset.department || "-"}</TableCell>
                  <TableCell>{formatDate(asset.updatedAt || asset.purchaseDate || asset.createdAt)}</TableCell>
                </TableRow>
              );
            })}
            {!loading && !filteredAssets.length ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No assets found for the selected filters.
                </TableCell>
              </TableRow>
            ) : null}
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading asset status data...
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}