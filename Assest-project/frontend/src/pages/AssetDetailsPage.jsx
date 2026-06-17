import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
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

export default function AssetDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAsset() {
      setLoading(true);
      try {
        const { data } = await api.get(`/assets/${id}`);
        if (active) {
          setAsset(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Failed to load asset details");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAsset();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500 }}>Asset Details</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Dashboard / Asset / Details
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackOutlinedIcon />}
          onClick={() => navigate("/assets")}
          sx={{ textTransform: "none" }}
        >
          Back to Assets
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        {loading ? (
          <Typography color="text.secondary">Loading asset details...</Typography>
        ) : asset ? (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ md: "center" }}>
              <Avatar
                variant="rounded"
                sx={{ width: 84, height: 84, bgcolor: "rgba(20,95,160,0.10)", color: "#155fa0" }}
              >
                <ImageOutlinedIcon sx={{ fontSize: 34 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{asset.name}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.4 }}>{asset.assetTag}</Typography>
              </Box>
            </Stack>

            <DetailRow label="ID" value={asset.id} />
            <DetailRow label="Asset Tag" value={asset.assetTag} />
            <DetailRow label="Asset Name" value={asset.name} />
            <DetailRow label="Type" value={asset.type?.replace("_", " ")} />
            <DetailRow label="Asset Status" value={asset.status} />
            <DetailRow label="Date Of Purchase" value={asset.purchaseDate ? String(asset.purchaseDate).slice(0, 10) : "-"} />
            <DetailRow label="Warranty Expiry" value={asset.warrantyExpiry ? String(asset.warrantyExpiry).slice(0, 10) : "-"} />
            <DetailRow label="Location" value={asset.location} />
            <DetailRow label="Assigned Employee" value={asset.assignedTo || "Not assigned"} />
            <DetailRow label="Assigned Date" value={asset.assignedAt ? String(asset.assignedAt).slice(0, 10) : "-"} />
            <DetailRow label="Specifications" value={asset.specs || "-"} />
          </Stack>
        ) : null}
      </Paper>
    </Stack>
  );
}