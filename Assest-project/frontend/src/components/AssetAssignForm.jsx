import { useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

export default function AssetAssignForm({ assets, employees, onAssign }) {
  const assignable = useMemo(() => assets.filter((a) => a.status === "available"), [assets]);
  const minReturnDate = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    assetId: "",
    employeeId: "",
    expectedReturnDate: "",
    notes: "",
  });
  const selectedAsset = assignable.find((asset) => String(asset.id) === String(form.assetId));
  const selectedEmployee = employees.find((employee) => String(employee.id) === String(form.employeeId));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expectedDateError, setExpectedDateError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setExpectedDateError("");

    const missingRequiredField =
      !String(form.assetId).trim() ||
      !String(form.employeeId).trim() ||
      !String(form.expectedReturnDate).trim();

    if (missingRequiredField) {
      setError("Please select an asset, employee, and expected return date.");
      if (!String(form.expectedReturnDate).trim()) {
        setExpectedDateError("Expected return date is required.");
      }
      return;
    }

    if (form.expectedReturnDate < minReturnDate) {
      setExpectedDateError("Expected return date cannot be in the past.");
      setError("Please fix the expected return date.");
      return;
    }

    const result = await onAssign({
      assetId: Number(form.assetId),
      employeeId: Number(form.employeeId),
      expectedReturnDate: form.expectedReturnDate,
      notes: form.notes,
    });

    if (!result.ok) {
      setError(result.message || "Failed to assign asset");
      return;
    }

    setForm({ assetId: "", employeeId: "", expectedReturnDate: "", notes: "" });
    setMessage("Asset assigned successfully.");
  }

  return (
    <Paper component="form" onSubmit={submit} sx={{ p: 3.5, maxWidth: 640, width: "100%" }}>
      <Stack spacing={2}>
        <Typography variant="h5">Asset Assignment</Typography>
        <Stack spacing={0.75}>
          <Typography variant="body2" fontWeight={600}>
            Asset
          </Typography>
          <Autocomplete
            options={assignable}
            value={selectedAsset || null}
            onChange={(_, value) =>
              setForm((prev) => ({
                ...prev,
                assetId: value ? String(value.id) : "",
              }))
            }
            getOptionLabel={(option) => option.name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="No available assets"
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search and select asset"
                helperText={
                  selectedAsset
                    ? `Selected: ${selectedAsset.assetTag} — ${selectedAsset.name}`
                    : assignable.length
                      ? "Choose one available asset from the list."
                      : "No available assets to assign right now."
                }
                fullWidth
              />
            )}
          />
          {selectedAsset ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
                  SELECTED ASSET
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {selectedAsset.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tag: {selectedAsset.assetTag}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Location: {selectedAsset.location}
                </Typography>
              </Stack>
            </Box>
          ) : null}
        </Stack>
        <Stack spacing={0.75}>
          <Typography variant="body2" fontWeight={600}>
            Employee
          </Typography>
          <Autocomplete
            options={employees}
            value={selectedEmployee || null}
            onChange={(_, value) =>
              setForm((prev) => ({
                ...prev,
                employeeId: value ? String(value.id) : "",
              }))
            }
            getOptionLabel={(option) => `${option.name} (${option.department})`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search and select employee"
                helperText={
                  selectedEmployee
                    ? `Selected: ${selectedEmployee.name} — ${selectedEmployee.department || "No department"}`
                    : "Choose the employee who will receive this asset."
                }
                fullWidth
              />
            )}
          />
        </Stack>
        <Stack spacing={0.75}>
          <Typography variant="body2" fontWeight={600}>
            Expected Return Date
          </Typography>
          <TextField
            type="date"
            value={form.expectedReturnDate}
            onChange={(e) => {
              const value = e.target.value;
              setForm((p) => ({ ...p, expectedReturnDate: value }));
              if (!value) {
                setExpectedDateError("Expected return date is required.");
                return;
              }
              if (value < minReturnDate) {
                setExpectedDateError("Expected return date cannot be in the past.");
                return;
              }
              setExpectedDateError("");
            }}
            inputProps={{ min: minReturnDate }}
            error={Boolean(expectedDateError)}
            helperText={expectedDateError || "Select a valid date from today onward."}
            fullWidth
          />
        </Stack>
        <TextField label="Notes" multiline minRows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Button
          variant="contained"
          type="submit"
          fullWidth
          sx={{
            height: 48,
            fontWeight: 700,
            fontSize: 15,
            textTransform: "none",
            borderRadius: 2,
            bgcolor: "#00695c",
            boxShadow: "none",
            "&:hover": { bgcolor: "#004d40", boxShadow: "none" },
          }}
        >
          Assign Asset
        </Button>
      </Stack>
    </Paper>
  );
}
