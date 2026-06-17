import {
  Alert,
  Box,
  Button,
  Drawer,
  InputAdornment,
  Menu,
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
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function normalizeType(value) {
  if (!value) return "Uncategorized";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarizeByType(rows) {
  const grouped = new Map();

  rows.forEach((asset) => {
    const key = normalizeType(asset.type);
    const current = grouped.get(key) || {
      name: key,
      total: 0,
      available: 0,
      assigned: 0,
      retired: 0,
      maintenance: 0,
    };

    current.total += 1;
    if (asset.status === "available") current.available += 1;
    if (asset.status === "assigned") current.assigned += 1;
    if (asset.status === "retired") current.retired += 1;
    if (asset.status === "maintenance") current.maintenance += 1;

    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function AssetSubCategoriesPage() {
  const [assets, setAssets] = useState([]);
  const [customSubCategories, setCustomSubCategories] = useState(() => {
    try {
      const saved = window.localStorage.getItem("asset-custom-sub-categories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    category: "",
    subCategory: "",
    description: "",
  });
  const rowsPerPage = 5;

  useEffect(() => {
    window.localStorage.setItem("asset-custom-sub-categories", JSON.stringify(customSubCategories));
  }, [customSubCategories]);

  useEffect(() => {
    async function loadAssets() {
      setLoading(true);
      try {
        const firstPage = await api.get("/assets", {
          params: { page: 1, pageSize: 100, sortField: "type", sortDirection: "asc" },
        });

        let allRows = firstPage.data.rows || [];
        const total = firstPage.data.total || allRows.length;
        const totalPages = Math.ceil(total / 100);

        if (totalPages > 1) {
          const requests = [];
          for (let page = 2; page <= totalPages; page += 1) {
            requests.push(
              api.get("/assets", {
                params: { page, pageSize: 100, sortField: "type", sortDirection: "asc" },
              })
            );
          }

          const pages = await Promise.all(requests);
          pages.forEach((res) => {
            allRows = allRows.concat(res.data.rows || []);
          });
        }

        setAssets(allRows);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load asset sub categories");
      } finally {
        setLoading(false);
      }
    }

    loadAssets();
  }, []);

  const categories = useMemo(() => summarizeByType(assets), [assets]);
  const availableCount = useMemo(
    () => assets.filter((asset) => asset.status === "available").length,
    [assets]
  );
  const assignedCount = useMemo(
    () => assets.filter((asset) => asset.status === "assigned").length,
    [assets]
  );

  const summaryCards = [
    {
      label: "Total Assets",
      value: assets.length,
    },
    {
      label: "Sub Categories",
      value: customSubCategories.length,
    },
    {
      label: "Available",
      value: availableCount,
    },
    {
      label: "Assigned",
      value: assignedCount,
    },
  ];

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return customSubCategories;

    return customSubCategories.filter((row) => {
      const values = [
        row.category,
        row.subCategory,
        row.description,
      ];
      return values.some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [customSubCategories, search]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    categories.forEach((item) => set.add(item.name));
    customSubCategories.forEach((item) => set.add(item.category));
    if (!set.size) {
      set.add("IT");
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categories, customSubCategories]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredCategories.length / rowsPerPage)),
    [filteredCategories.length]
  );

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredCategories.slice(start, start + rowsPerPage);
  }, [filteredCategories, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function tableRowsForExport() {
    return filteredCategories.map((row) => ({
      category: row.category,
      subCategory: row.subCategory,
      description: row.description,
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
    const header = ["Category", "Sub Category", "Description"];
    const body = tableRowsForExport().map((row) => [
      row.category,
      row.subCategory,
      row.description,
    ]);
    const escaped = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    downloadFile(
      escaped,
      `asset-sub-categories.${extension}`,
      extension === "xls" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;"
    );
  }

  function handleActionsMenuOpen(event) {
    setActionsAnchorEl(event.currentTarget);
  }

  function handleActionsMenuClose() {
    setActionsAnchorEl(null);
  }

  function openPrintableTable(shouldPrint = false) {
    const body = tableRowsForExport()
      .map(
        (row) =>
          `<tr>
            <td>${row.category}</td>
            <td>${row.subCategory}</td>
            <td>${row.description || "-"}</td>
          </tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Asset Sub Categories</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 12px 0; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Asset Sub Categories</h1>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();

    if (shouldPrint) {
      win.focus();
      win.print();
    }
  }

  function resetForm() {
    setForm({ category: "", subCategory: "", description: "" });
    setFormError("");
  }

  function handleAddSubCategory() {
    if (!form.category.trim() || !form.subCategory.trim()) {
      setFormError("Category and Sub Category are required.");
      return;
    }

    const newItem = {
      id: Date.now(),
      category: normalizeType(form.category),
      subCategory: form.subCategory.trim(),
      description: form.description.trim(),
    };

    setCustomSubCategories((prev) => [newItem, ...prev]);
    setAddOpen(false);
    resetForm();
  }

  function handleDeleteSubCategory(id) {
    setCustomSubCategories((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Asset Sub Category List
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              <Box component="span" sx={{ color: "#6366f1", fontWeight: 500 }}>
                Dashboard
              </Box>{" "}
              / Manage
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => setAddOpen(true)}
            sx={{
              ml: { sm: "auto" },
              alignSelf: { xs: "flex-start", sm: "center" },
              textTransform: "none",
              bgcolor: "#00695c",
              "&:hover": { bgcolor: "#004d40" },
              minWidth: 62,
              height: 36,
              px: 2,
              borderRadius: "6px",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 4px 10px rgba(0, 105, 92, 0.24)",
            }}
          >
            Add
          </Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "repeat(4, minmax(0, 1fr))",
            },
            gap: 1.2,
          }}
        >
          {summaryCards.map((card) => (
            <Paper
              key={card.label}
              elevation={0}
              sx={{
                px: 1.4,
                py: 1.1,
                borderRadius: "6px",
                color: "#111827",
                bgcolor: "#ffffff",
                border: "1px solid #e5e7eb",
                display: "grid",
                alignContent: "space-between",
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                {card.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {card.value}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          p: 1.5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "6px",
          bgcolor: "#fff",
          overflowX: "auto",
        }}
      >
        <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0, width: "100%", justifyContent: "flex-end", alignItems: "center" }}>
            <TextField
              placeholder="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchOutlinedIcon sx={{ fontSize: 18, color: "#9ca3af" }} /></InputAdornment>,
              }}
              sx={{ width: { xs: "100%", sm: 260 }, maxWidth: { xs: "100%", sm: 420 }, "& .MuiOutlinedInput-root": { borderRadius: "6px", height: 40, fontSize: 14 } }}
            />
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleActionsMenuOpen} sx={{ textTransform: "none", color: "#111827", borderColor: "#d1d5db", borderRadius: "6px", height: 40, px: 2, fontSize: 14 }}>Export</Button>
            <Menu anchorEl={actionsAnchorEl} open={Boolean(actionsAnchorEl)} onClose={handleActionsMenuClose}>
              <MenuItem onClick={() => { handleCsvDownload("xls"); handleActionsMenuClose(); }}>Excel</MenuItem>
              <MenuItem onClick={() => { handleCsvDownload("csv"); handleActionsMenuClose(); }}>CSV</MenuItem>
              <MenuItem onClick={() => { openPrintableTable(false); handleActionsMenuClose(); }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                  <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />
                  PDF
                </Box>
              </MenuItem>
            </Menu>
          </Stack>
        </Box>
      </Stack>

      <Paper sx={{ overflow: "hidden" }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e5e7eb", bgcolor: "#f9fafb" }}>
          <Typography sx={{ fontWeight: 700 }}>Added Sub Categories</Typography>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Sub Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customSubCategories.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.subCategory}</TableCell>
                <TableCell>{row.description || "-"}</TableCell>
                <TableCell align="right">
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => handleDeleteSubCategory(row.id)}
                    sx={{ textTransform: "none" }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!customSubCategories.length ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No sub categories added yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Drawer
        anchor="right"
        open={addOpen}
        onClose={() => { setAddOpen(false); resetForm(); }}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 0 } }}
      >
        <Stack sx={{ height: "100%" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#f8fafc" }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
              Add Sub Category
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ p: 2.5, overflowY: "auto" }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}

            <TextField
              label="Category"
              select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              required
              fullWidth
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
            >
              {categoryOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Sub Category Name"
              value={form.subCategory}
              onChange={(event) => setForm((prev) => ({ ...prev, subCategory: event.target.value }))}
              required
              fullWidth
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
            />

            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={3}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
            />
          </Stack>

          <Stack direction="row" spacing={1.25} sx={{ mt: "auto", p: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Button
              variant="contained"
              onClick={handleAddSubCategory}
              sx={{ textTransform: "none", borderRadius: "6px", bgcolor: "#173255", "&:hover": { bgcolor: "#0f2748" } }}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              onClick={() => { setAddOpen(false); resetForm(); }}
              sx={{ textTransform: "none", borderRadius: "6px" }}
            >
              Close
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </Stack>
  );
}
