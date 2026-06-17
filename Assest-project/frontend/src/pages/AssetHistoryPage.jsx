import { useEffect, useMemo, useState } from "react";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api from "../api/client";

const mockHistoryData = [
  {
    id: 1,
    assetTag: "Dell Inspiron 2332",
    assignedTo: "Radhika Gandhi",
    description: "good",
    note: "ftytyyit",
    createdDate: "08/02/2023",
    status: "Available",
  },
  {
    id: 2,
    assetTag: "DELL-6526",
    assignedTo: "Rakesh Jain",
    description: "Dell Laptop(4GB, 1TB)",
    note: "New Asset Assigned",
    createdDate: "23/02/2023",
    status: "Available",
  },
];

export default function AssetHistoryPage() {
  const [historyData, setHistoryData] = useState(mockHistoryData);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const rowsPerPage = 10;

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function toTitleCase(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data } = await api.get("/assets", {
          params: {
            page: 1,
            pageSize: 500,
            sortField: "id",
            sortDirection: "desc",
          },
        });

        const rows = Array.isArray(data?.rows)
          ? data.rows.map((row) => ({
              id: row.id,
              assetTag: row.assetTag || "-",
              assignedTo: row.assignedTo || "-",
              description: row.specs || "-",
              note: row.note || row.description || "-",
              createdDate: formatDate(row.createdAt || row.purchaseDate),
              status: toTitleCase(row.status || "available"),
            }))
          : [];

        if (rows.length > 0) {
          setHistoryData(rows);
        }
      } catch {
        // Keep mock data as fallback if API data is unavailable.
      }
    }

    loadHistory();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchKeyword.trim()) return historyData;
    const keyword = searchKeyword.toLowerCase();
    return historyData.filter(
      (row) =>
        String(row.id).toLowerCase().includes(keyword) ||
        (row.assetTag || "").toLowerCase().includes(keyword) ||
        (row.assignedTo || "").toLowerCase().includes(keyword) ||
        (row.description || "").toLowerCase().includes(keyword)
    );
  }, [historyData, searchKeyword]);

  const paginatedData = useMemo(() => {
    const startIdx = (page - 1) * rowsPerPage;
    return filteredData.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  function tableRowsForExport() {
    return filteredData.map((row, index) => ({
      serialNo: index + 1,
      assetTag: row.assetTag || "",
      assignedTo: row.assignedTo || "-",
      description: row.description || "-",
      note: row.note || "-",
      createdDate: row.createdDate || "-",
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
    const header = ["S.No", "Asset Model No", "Assign Employee", "Description", "note", "Created Date", "Status"];
    const body = tableRowsForExport().map((row) => [
      row.serialNo,
      row.assetTag,
      row.assignedTo,
      row.description,
      row.note,
      row.createdDate,
      row.status,
    ]);
    const escaped = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadFile(escaped, `asset-history.${extension}`, extension === "xls" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;");
  }

  function handleExportMenuOpen(event) {
    setExportMenuAnchor(event.currentTarget);
  }

  function handleExportMenuClose() {
    setExportMenuAnchor(null);
  }

  function openPrintableTable(shouldPrint = false) {
    const body = tableRowsForExport()
      .map(
        (row) =>
          `<tr><td>${row.serialNo}</td><td>${row.assetTag}</td><td>${row.assignedTo}</td><td>${row.description}</td><td>${row.note}</td><td>${row.createdDate}</td><td>${row.status}</td></tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Asset History</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d8dde6; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f7f9fc; }
          </style>
        </head>
        <body>
          <h1>Asset History List</h1>
          <table>
            <thead><tr><th>S.No</th><th>Asset Model No</th><th>Assign Employee</th><th>Description</th><th>note</th><th>Created Date</th><th>Status</th></tr></thead>
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

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: "#0f766e" }}>
            Asset History List
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            Dashboard / Manage
          </Typography>
        </Box>
      </Stack>

      <Paper
        sx={{
          p: 2.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "6px",
          boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto", width: "100%", justifyContent: "flex-end" }}>
            <TextField
              placeholder="Search..."
              size="small"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchOutlinedIcon sx={{ fontSize: 20, color: "#9ca3af" }} /></InputAdornment>,
              }}
              sx={{ width: { xs: "100%", md: 300 }, maxWidth: { xs: "100%", md: 420 }, "& .MuiOutlinedInput-root": { borderRadius: "6px", height: 40, fontSize: 14 } }}
            />
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExportMenuOpen}
              sx={{ textTransform: "none", color: "#111827", borderColor: "#d1d5db", borderRadius: "6px", height: 40, px: 2, fontSize: 14, whiteSpace: "nowrap" }}
            >
              Export
            </Button>
            <Menu anchorEl={exportMenuAnchor} open={Boolean(exportMenuAnchor)} onClose={handleExportMenuClose}>
              <MenuItem onClick={() => { handleCsvDownload("xls"); handleExportMenuClose(); }}>Excel</MenuItem>
              <MenuItem onClick={() => { handleCsvDownload("csv"); handleExportMenuClose(); }}>CSV</MenuItem>
              <MenuItem onClick={() => { openPrintableTable(false); handleExportMenuClose(); }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                  <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />
                  PDF
                </Box>
              </MenuItem>
            </Menu>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>S.No</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>Asset Model No</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>Assign Employee</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>Description</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>note</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>Created Date</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px", fontSize: 13, color: "#1f2937" }}>
                      <Stack direction="row" alignItems="center" spacing={0.6}>
                        <Typography
                          component={RouterLink}
                          to={`/assets/history/${row.id}`}
                          sx={{ color: "#00695c", fontWeight: 700, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                        >
                          {(page - 1) * rowsPerPage + index + 1}
                        </Typography>
                      </Stack>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#1f2937" }}>{row.assetTag}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#1f2937" }}>{row.assignedTo}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#1f2937" }}>{row.description}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#1f2937" }}>{row.note}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#1f2937" }}>{row.createdDate}</td>
                    <td style={{ padding: "12px", fontSize: 13 }}>
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          color: "#fff",
                          bgcolor: row.status === "Available" ? "#00695c" : "#334155",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
              Showing {paginatedData.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredData.length)} of{" "}
              {filteredData.length} entries
            </Typography>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                sx={{ textTransform: "none", borderColor: "#99d5cc", color: "#00695c", minWidth: 48 }}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setPage(p)}
                  sx={{
                    textTransform: "none",
                    minWidth: 36,
                    bgcolor: p === page ? "#00695c" : "transparent",
                    borderColor: "#99d5cc",
                    color: p === page ? "#fff" : "#00695c",
                  }}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outlined"
                size="small"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                sx={{ textTransform: "none", borderColor: "#99d5cc", color: "#00695c", minWidth: 48 }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
