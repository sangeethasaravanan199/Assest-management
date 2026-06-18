import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";

function DetailRow({ label, value }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "220px 1fr" },
        gap: 2,
        px: 2,
        py: 1.5,
        bgcolor: "grey.50",
        borderRadius: 1.5,
      }}
    >
      <Typography sx={{ fontWeight: 700, color: "#374151" }}>{label}</Typography>
      <Typography sx={{ color: "#4b5563" }}>{value || "-"}</Typography>
    </Box>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function toTitleCase(value) {
  return String(value || "-")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function estimatePurchaseValue(asset) {
  const byType = {
    laptop: 80000,
    desktop: 60000,
    monitor: 20000,
    printer: 25000,
    network_device: 120000,
  };
  return byType[asset?.type] || 50000;
}

function getDepreciation(asset) {
  const purchaseValue = estimatePurchaseValue(asset);
  const purchaseDate = new Date(asset?.purchaseDate || Date.now());
  const now = new Date();
  const ageYears = Math.max(0, (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365.25));
  const usefulLifeYears = 5;
  const depreciationPct = Math.min(100, (ageYears / usefulLifeYears) * 100);
  const salvagePct = 10;
  const depreciableValue = purchaseValue * (1 - salvagePct / 100);
  const accumulated = (depreciationPct / 100) * depreciableValue;
  const currentValue = Math.max(purchaseValue - accumulated, purchaseValue * (salvagePct / 100));

  return {
    purchaseValue,
    depreciationPct,
    accumulated,
    currentValue,
    method: "Straight-line (5 years)",
  };
}

function Section({ title, children }) {
  return (
    <Paper sx={{ p: 2.2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      <Typography sx={{ fontWeight: 700, color: "#0f766e", mb: 1.4 }}>{title}</Typography>
      <Stack spacing={1.2}>{children}</Stack>
    </Paper>
  );
}

export default function AssetHistoryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAssetHistoryDetails() {
      setLoading(true);
      try {
        const [{ data: assetData }, assignmentsRes, maintenanceRes] = await Promise.all([
          api.get(`/assets/${id}`),
          api.get("/assets/assignments").catch(() => ({ data: [] })),
          api.get("/maintenance").catch(() => ({ data: [] })),
        ]);

        const assignments = Array.isArray(assignmentsRes?.data)
          ? assignmentsRes.data.filter((row) => Number(row.assetId) === Number(id))
          : [];

        const maintenance = Array.isArray(maintenanceRes?.data)
          ? maintenanceRes.data.filter((row) => Number(row.assetId) === Number(id))
          : [];

        if (active) {
          setAsset(assetData);
          setAssignmentHistory(assignments);
          setMaintenanceRecords(maintenance);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Failed to load asset history details");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAssetHistoryDetails();
    return () => {
      active = false;
    };
  }, [id]);

  const depreciation = getDepreciation(asset);
  const isDisposed = String(asset?.status || "").toLowerCase() === "retired";

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: "#0f766e" }}>Asset History Change Details</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Dashboard / Asset History / Change Details
          </Typography>
        </Box>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        {loading ? (
          <Typography color="text.secondary">Loading history details...</Typography>
        ) : asset ? (
          <Stack spacing={2.2}>
            <Section title="Change Details">
              <DetailRow label="Created On" value={formatDate(asset.createdAt || asset.purchaseDate)} />
              <DetailRow label="Last Modified" value={formatDate(asset.updatedAt)} />
              <DetailRow label="Total Assignment Changes" value={assignmentHistory.length} />
              <DetailRow label="Total Maintenance Changes" value={maintenanceRecords.length} />
              <DetailRow label="Current Lifecycle State" value={toTitleCase(asset.status)} />
            </Section>

            <Section title="Asset Lifecycle Overview">
              <DetailRow label="Asset ID" value={asset.id} />
              <DetailRow label="Asset Model No" value={asset.assetTag} />
              <DetailRow label="Current Status" value={toTitleCase(asset.status)} />
              <DetailRow label="Description" value={asset.specs || "-"} />
            </Section>

            <Section title="Purchase Details">
              <DetailRow label="Purchase Date" value={formatDate(asset.purchaseDate)} />
              <DetailRow label="Warranty Expiry" value={formatDate(asset.warrantyExpiry)} />
              <DetailRow label="Recorded On" value={formatDate(asset.createdAt)} />
              <DetailRow label="Estimated Purchase Value" value={formatCurrency(depreciation.purchaseValue)} />
            </Section>

            <Section title="Assignment Tracking">
              <DetailRow label="Current Assignee" value={asset.assignedTo || "Unassigned"} />
              <DetailRow label="Current Department" value={asset.department || "-"} />
              <DetailRow label="Current Assignment Date" value={formatDate(asset.assignedAt)} />
              <Divider />
              {assignmentHistory.length ? (
                assignmentHistory.map((entry) => (
                  <Box key={entry.id} sx={{ p: 1.4, borderRadius: 1.5, bgcolor: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    <Typography sx={{ fontWeight: 600, color: "#111827" }}>{entry.employeeName || "-"}</Typography>
                    <Typography sx={{ fontSize: 13, color: "#4b5563" }}>
                      Assigned: {formatDate(entry.assignedAt)} | Expected Return: {formatDate(entry.expectedReturnDate)} | Returned: {formatDate(entry.returnedAt)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#4b5563" }}>
                      Department: {entry.department || "-"} | Notes: {entry.notes || "-"}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" sx={{ fontSize: 14 }}>No assignment records found.</Typography>
              )}
            </Section>

            <Section title="Maintenance Records">
              {maintenanceRecords.length ? (
                maintenanceRecords.map((record) => (
                  <Box key={record.id} sx={{ p: 1.4, borderRadius: 1.5, bgcolor: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    <Typography sx={{ fontWeight: 600, color: "#111827" }}>{record.title || "Maintenance"}</Typography>
                    <Typography sx={{ fontSize: 13, color: "#4b5563" }}>
                      Priority: {toTitleCase(record.priority)} | Status: {toTitleCase(record.status)} | Cost: {formatCurrency(record.cost)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#4b5563" }}>
                      Created: {formatDate(record.createdAt)} | Resolved: {formatDate(record.resolvedAt)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#4b5563" }}>{record.description || "-"}</Typography>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" sx={{ fontSize: 14 }}>No maintenance records found.</Typography>
              )}
            </Section>

            <Section title="Location Changes">
              <DetailRow label="Current Location" value={asset.location || "-"} />
              <DetailRow label="Last Updated" value={formatDate(asset.updatedAt)} />
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Historical location-change events are not explicitly recorded in the current schema. This section shows the latest tracked location metadata.
              </Typography>
            </Section>

            <Section title="Depreciation">
              <DetailRow label="Method" value={depreciation.method} />
              <DetailRow label="Depreciation %" value={`${depreciation.depreciationPct.toFixed(1)}%`} />
              <DetailRow label="Accumulated Depreciation" value={formatCurrency(depreciation.accumulated)} />
              <DetailRow label="Current Book Value" value={formatCurrency(depreciation.currentValue)} />
            </Section>

            <Section title="Disposal Details">
              <DetailRow label="Disposal Status" value={isDisposed ? "Disposed" : "Active"} />
              <DetailRow label="Disposal Date" value={isDisposed ? formatDate(asset.updatedAt) : "-"} />
              <DetailRow label="Disposal Method" value={isDisposed ? "Retired from service" : "-"} />
              <DetailRow label="Remarks" value={isDisposed ? "Asset marked as retired in lifecycle records" : "Asset is currently in active lifecycle"} />
            </Section>
          </Stack>
        ) : null}
      </Paper>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate("/assets/history")}
          sx={{ textTransform: "none", borderColor: "#00695c", color: "#00695c", minWidth: 120 }}
        >
          Close
        </Button>
      </Stack>
    </Stack>
  );
}
