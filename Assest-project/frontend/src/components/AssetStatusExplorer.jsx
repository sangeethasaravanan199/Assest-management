import { useMemo, useState } from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";

const statusOptions = ["", "available", "assigned", "maintenance", "retired"];
const typeOptions = ["", "laptop", "desktop", "monitor", "printer", "network_device"];

function fmtDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function getHealth(asset) {
  if (asset.status === "retired") return "Retired";
  if (asset.status === "maintenance") return "Needs Service";
  if (!asset.warrantyExpiry) return "Unknown";

  const today = new Date();
  const exp = new Date(asset.warrantyExpiry);
  if (Number.isNaN(exp.getTime())) return "Unknown";

  const days = Math.ceil((exp.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "Expired";
  if (days <= 45) return "Expiring Soon";
  return "Healthy";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetIso(daysBack) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function quarterRangeIso() {
  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), quarterStartMonth, 1);
  const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10),
  };
}

export default function AssetStatusExplorer({ rows }) {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    search: "",
    status: "",
    type: "",
  });
  const [sort, setSort] = useState({ orderBy: "assetTag", order: "asc" });

  const filteredRows = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return rows.filter((asset) => {
      const purchase = asset.purchaseDate ? String(asset.purchaseDate).slice(0, 10) : "";

      if (filters.fromDate && (!purchase || purchase < filters.fromDate)) return false;
      if (filters.toDate && (!purchase || purchase > filters.toDate)) return false;
      if (filters.status && asset.status !== filters.status) return false;
      if (filters.type && asset.type !== filters.type) return false;

      if (!query) return true;
      const text = `${asset.assetTag || ""} ${asset.name || ""} ${asset.location || ""} ${asset.assignedTo || ""}`.toLowerCase();
      return text.includes(query);
    });
  }, [rows, filters]);

  const summary = useMemo(() => {
    const counts = {
      total: filteredRows.length,
      available: 0,
      assigned: 0,
      maintenance: 0,
      retired: 0,
    };

    filteredRows.forEach((asset) => {
      if (asset.status in counts) counts[asset.status] += 1;
    });

    return counts;
  }, [filteredRows]);

  const sortedRows = useMemo(() => {
    const items = [...filteredRows];
    const { orderBy, order } = sort;

    const readValue = (asset) => {
      switch (orderBy) {
        case "health":
          return getHealth(asset);
        case "purchaseDate":
          return fmtDate(asset.purchaseDate);
        case "warrantyExpiry":
          return fmtDate(asset.warrantyExpiry);
        default:
          return asset[orderBy] ?? "";
      }
    };

    items.sort((a, b) => {
      const av = String(readValue(a)).toLowerCase();
      const bv = String(readValue(b)).toLowerCase();
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }, [filteredRows, sort]);

  function resetFilters() {
    setFilters({ fromDate: "", toDate: "", search: "", status: "", type: "" });
  }

  function setQuickRange(kind) {
    if (kind === "last7") {
      setFilters((prev) => ({ ...prev, fromDate: dateOffsetIso(6), toDate: todayIso() }));
      return;
    }
    if (kind === "last30") {
      setFilters((prev) => ({ ...prev, fromDate: dateOffsetIso(29), toDate: todayIso() }));
      return;
    }
    if (kind === "quarter") {
      const range = quarterRangeIso();
      setFilters((prev) => ({ ...prev, ...range }));
    }
  }

  function handleSort(column) {
    setSort((prev) => {
      if (prev.orderBy === column) {
        return { ...prev, order: prev.order === "asc" ? "desc" : "asc" };
      }
      return { orderBy: column, order: "asc" };
    });
  }

  function exportCsv() {
    if (!sortedRows.length) return;

    const header = [
      "Asset Tag",
      "Asset Name",
      "Type",
      "Status",
      "Health",
      "Location",
      "Purchase Date",
      "Warranty Expiry",
      "Assigned To",
    ];

    const data = sortedRows.map((asset) => [
      asset.assetTag || "",
      asset.name || "",
      asset.type || "",
      asset.status || "",
      getHealth(asset),
      asset.location || "",
      fmtDate(asset.purchaseDate),
      fmtDate(asset.warrantyExpiry),
      asset.assignedTo || "",
    ]);

    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [header, ...data].map((row) => row.map(escape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asset-status-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (!sortedRows.length) return;

    const htmlRows = sortedRows
      .map(
        (asset) =>
          `<tr>
            <td>${asset.assetTag || ""}</td>
            <td>${asset.name || ""}</td>
            <td>${asset.type || ""}</td>
            <td>${asset.status || ""}</td>
            <td>${getHealth(asset)}</td>
            <td>${asset.location || ""}</td>
            <td>${fmtDate(asset.purchaseDate)}</td>
            <td>${fmtDate(asset.warrantyExpiry)}</td>
            <td>${asset.assignedTo || ""}</td>
          </tr>`
      )
      .join("");

    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Asset Status Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1 { margin: 0 0 8px; }
            p { margin: 0 0 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Asset Status Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Health</th>
                <th>Location</th>
                <th>Purchase Date</th>
                <th>Warranty Expiry</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Asset Status Explorer</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            View all assets and their status information.
          </Typography>
        </Box>



        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, maxHeight: 420 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {[
                  { key: "assetTag", label: "Asset Tag" },
                  { key: "name", label: "Asset Name" },
                  { key: "type", label: "Type" },
                  { key: "status", label: "Status" },
                  { key: "health", label: "Health" },
                  { key: "location", label: "Location" },
                  { key: "purchaseDate", label: "Purchase Date" },
                  { key: "warrantyExpiry", label: "Warranty Expiry" },
                  { key: "assignedTo", label: "Assigned To" },
                ].map((col) => (
                  <TableCell key={col.key}>
                    <TableSortLabel
                      active={sort.orderBy === col.key}
                      direction={sort.orderBy === col.key ? sort.order : "asc"}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No matching assets found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((asset) => (
                  <TableRow key={asset.id} hover>
                    <TableCell>{asset.assetTag}</TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>{asset.status}</TableCell>
                    <TableCell>{getHealth(asset)}</TableCell>
                    <TableCell>{asset.location || "-"}</TableCell>
                    <TableCell>{fmtDate(asset.purchaseDate)}</TableCell>
                    <TableCell>{fmtDate(asset.warrantyExpiry)}</TableCell>
                    <TableCell>{asset.assignedTo || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Paper>
  );
}
