import { useEffect, useState } from "react";
import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import api from "../api/client";
import AssetAssignForm from "../components/AssetAssignForm";
import AssignmentHistory from "../components/AssignmentHistory";

export default function AssetAssignPage() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      const [assetsRes, employeesRes, assignmentsRes] = await Promise.all([
        api.get("/assets", { params: { page: 1, pageSize: 100, sortField: "assetTag", sortDirection: "asc" } }),
        api.get("/users/employees"),
        api.get("/assets/assignments"),
      ]);
      setAssets(assetsRes.data.rows);
      setEmployees(employeesRes.data);
      setAssignments(assignmentsRes.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assignment data");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function assignAsset(payload) {
    try {
      await api.post(`/assets/${payload.assetId}/assign`, {
        employeeId: payload.employeeId,
        expectedReturnDate: payload.expectedReturnDate,
        notes: payload.notes,
      });
      await loadData();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error.response?.data?.message || "Assignment failed",
      };
    }
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h4" gutterBottom>
          Assign Asset
        </Typography>
        <Typography color="text.secondary">
          Link available devices to employees with return dates and assignment notes.
        </Typography>
      </Paper>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <AssetAssignForm assets={assets} employees={employees} onAssign={assignAsset} />
      </Box>
      <AssignmentHistory assignments={assignments} />
    </Stack>
  );
}

