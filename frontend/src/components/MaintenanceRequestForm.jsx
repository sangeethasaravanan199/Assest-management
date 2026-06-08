import { useState } from "react";
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";

export default function MaintenanceRequestForm({ assets, onCreate }) {
  const [form, setForm] = useState({
    assetId: "",
    title: "",
    description: "",
    priority: "medium",
  });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.assetId || form.title.trim().length < 5 || form.description.trim().length < 10) {
      setError("Please complete all fields with valid values.");
      return;
    }

    const result = await onCreate({
      assetId: Number(form.assetId),
      title: form.title,
      description: form.description,
      priority: form.priority,
    });

    if (!result.ok) {
      setError(result.message || "Failed to submit maintenance request");
      return;
    }

    setForm({ assetId: "", title: "", description: "", priority: "medium" });
  }

  return (
    <Paper component="form" onSubmit={submit} sx={{ p: 2.5, maxWidth: 720 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Maintenance Request</Typography>
        <TextField label="Asset" select value={form.assetId} onChange={(e) => setForm((p) => ({ ...p, assetId: e.target.value }))}>
          <MenuItem value="">Select asset</MenuItem>
          {assets.map((asset) => (
            <MenuItem key={asset.id} value={asset.id}>
              {asset.assetTag} - {asset.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Issue Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        <TextField label="Description" multiline minRows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        <TextField label="Priority" select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
        </TextField>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Button variant="contained" type="submit">Submit Request</Button>
      </Stack>
    </Paper>
  );
}
