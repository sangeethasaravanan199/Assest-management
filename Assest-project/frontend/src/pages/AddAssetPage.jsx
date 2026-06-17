import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const typeOptions = ["laptop", "desktop", "monitor", "printer", "network_device"];
const statusOptions = ["available", "assigned", "maintenance", "retired"];
const departmentOptions = ["Information Technology", "Human Resources", "Finance", "Operations", "Marketing"];
const subDeptOptions = [
  "Procurement Specialist",
  "Technical Support Specialist",
  "Network Administrator",
  "HR Manager",
  "Finance Analyst",
];
const locationOptions = ["Head Office", "Branch Office", "Server Room", "Warehouse", "Remote Employee"];
const lifecycleOptions = ["In Service", "In Stock", "Under Repair", "Ready To Retire"];

const initialForm = {
  assetTag: "",
  name: "",
  description: "",
  unitPrice: "",
  status: "available",
  purchaseDate: "",
  type: "laptop",
  subCategory: "",
  supplier: "",
  department: "",
  subDepartment: "",
  dateOfManufacture: "",
  warrantyExpiry: "",
  location: "",
  note: "",
  createdDate: new Date().toISOString().slice(0, 10),
  assignEmployee: "",
  lifecycleStage: "In Service",
  invoiceNumber: "",
};

const labelSx = { fontSize: 13, fontWeight: 600, color: "#334155", mb: 0.6 };
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    bgcolor: "#fff",
  },
};

function formatOption(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function Field({ label, children, req }) {
  return (
    <Box>
      <Typography sx={labelSx}>
        {label}
        {req ? <Box component="span" sx={{ color: "error.main", ml: 0.3 }}>*</Box> : null}
      </Typography>
      {children}
    </Box>
  );
}

function Section({ title, description, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: "6px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "#fff",
      }}
    >
      <Stack spacing={0.5} sx={{ mb: 2.2 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0f766e" }}>{title}</Typography>
        <Typography sx={{ fontSize: 13, color: "#64748b" }}>{description}</Typography>
      </Stack>
      {children}
    </Paper>
  );
}

export default function AddAssetPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [employees, setEmployees] = useState([]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requiredFields = useMemo(
    () => ({
      assetTag: "Asset Tag / Model No",
      name: "Asset Name",
      type: "Category",
      status: "Asset Status",
      location: "Location",
      purchaseDate: "Purchase Date",
      warrantyExpiry: "Warranty Expiry Date",
    }),
    []
  );

  useEffect(() => {
    api
      .get("/users/employees")
      .then(({ data }) => setEmployees(data))
      .catch(() => setEmployees([]));
  }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const next = {};
    Object.keys(requiredFields).forEach((field) => {
      if (!String(form[field] || "").trim()) {
        next[field] = `${requiredFields[field]} is required`;
      }
    });
    if (form.purchaseDate && form.warrantyExpiry && form.warrantyExpiry < form.purchaseDate) {
      next.warrantyExpiry = "Warranty date cannot be before purchase date";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.post("/assets", {
        assetTag: form.assetTag.trim(),
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim(),
        purchaseDate: form.purchaseDate,
        warrantyExpiry: form.warrantyExpiry,
        specs: form.description.trim() || undefined,
      });
      navigate("/assets", { replace: true });
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to create asset");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "6px" }}>
        <Stack spacing={0.5}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Insert Asset
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>
            Dashboard / Asset / Add
          </Typography>
        </Stack>
      </Paper>

      {submitError ? <Alert severity="error">{submitError}</Alert> : null}

      <Stack component="form" onSubmit={handleSubmit} spacing={2.2}>
        <Section
          title="Asset Identification"
          description="Capture the key identity fields used to recognize and classify the asset."
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <Field label="Asset Tag / Model No" req>
              <TextField
                fullWidth
                size="small"
                value={form.assetTag}
                onChange={(e) => set("assetTag", e.target.value)}
                error={Boolean(errors.assetTag)}
                helperText={errors.assetTag}
                sx={fieldSx}
              />
            </Field>
            <Field label="Asset Name" req>
              <TextField
                fullWidth
                size="small"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                error={Boolean(errors.name)}
                helperText={errors.name}
                sx={fieldSx}
              />
            </Field>
            <Field label="Category" req>
              <TextField
                select
                fullWidth
                size="small"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                error={Boolean(errors.type)}
                helperText={errors.type}
                sx={fieldSx}
              >
                {typeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatOption(option)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
            <Field label="Sub Category">
              <TextField
                fullWidth
                size="small"
                value={form.subCategory}
                onChange={(e) => set("subCategory", e.target.value)}
                placeholder="Enter sub category"
                sx={fieldSx}
              />
            </Field>
            <Field label="Asset Status" req>
              <TextField
                select
                fullWidth
                size="small"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                error={Boolean(errors.status)}
                helperText={errors.status}
                sx={fieldSx}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatOption(option)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
            <Field label="Lifecycle Stage">
              <TextField
                select
                fullWidth
                size="small"
                value={form.lifecycleStage}
                onChange={(e) => set("lifecycleStage", e.target.value)}
                sx={fieldSx}
              >
                {lifecycleOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
          </Box>
        </Section>

        <Section
          title="Asset Details"
          description="Add descriptive and organizational details to improve search, reporting, and support workflows."
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <Field label="Description">
              <TextField
                fullWidth
                size="small"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                multiline
                minRows={3}
                sx={fieldSx}
              />
            </Field>
            <Field label="Supplier / Vendor">
              <TextField
                fullWidth
                size="small"
                value={form.supplier}
                onChange={(e) => set("supplier", e.target.value)}
                sx={fieldSx}
              />
            </Field>
            <Field label="Note">
              <TextField
                fullWidth
                size="small"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                multiline
                minRows={3}
                sx={fieldSx}
              />
            </Field>
            <Field label="Department">
              <TextField
                select
                fullWidth
                size="small"
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                sx={fieldSx}
              >
                {departmentOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
            <Field label="Sub Department">
              <TextField
                select
                fullWidth
                size="small"
                value={form.subDepartment}
                onChange={(e) => set("subDepartment", e.target.value)}
                sx={fieldSx}
              >
                {subDeptOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
          </Box>
        </Section>

        <Section
          title="Assignment And Location"
          description="Record where the asset is located and who is responsible for using or managing it."
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <Field label="Assigned Employee">
              <TextField
                select
                fullWidth
                size="small"
                value={form.assignEmployee}
                onChange={(e) => set("assignEmployee", e.target.value)}
                sx={fieldSx}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.name}>{employee.name}</MenuItem>
                ))}
              </TextField>
            </Field>
            <Field label="Location" req>
              <TextField
                select
                fullWidth
                size="small"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                error={Boolean(errors.location)}
                helperText={errors.location}
                sx={fieldSx}
              >
                {locationOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
            <Field label="Created Date">
              <TextField
                type="date"
                fullWidth
                size="small"
                value={form.createdDate}
                onChange={(e) => set("createdDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Field>
          </Box>
        </Section>

        <Section
          title="Purchase And Financial Information"
          description="Keep procurement and cost records together for audits, finance teams, and asset valuation."
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <Field label="Purchase Date" req>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={form.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
                error={Boolean(errors.purchaseDate)}
                helperText={errors.purchaseDate}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Field>
            <Field label="Unit Price">
              <TextField
                fullWidth
                size="small"
                value={form.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value)}
                placeholder="Enter amount"
                sx={fieldSx}
              />
            </Field>
            <Field label="Invoice Number">
              <TextField
                fullWidth
                size="small"
                value={form.invoiceNumber}
                onChange={(e) => set("invoiceNumber", e.target.value)}
                sx={fieldSx}
              />
            </Field>
          </Box>
        </Section>

        <Section
          title="Warranty And Lifecycle Tracking"
          description="Track manufacture, warranty, and service timing so lifecycle status stays clear and actionable."
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <Field label="Manufacture Date">
              <TextField
                type="date"
                fullWidth
                size="small"
                value={form.dateOfManufacture}
                onChange={(e) => set("dateOfManufacture", e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Field>
            <Field label="Warranty Expiry Date" req>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={form.warrantyExpiry}
                onChange={(e) => set("warrantyExpiry", e.target.value)}
                error={Boolean(errors.warrantyExpiry)}
                helperText={errors.warrantyExpiry}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Field>
            <Field label="Current Status">
              <TextField
                select
                fullWidth
                size="small"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                sx={fieldSx}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatOption(option)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
          </Box>
        </Section>

        <Section
          title="Attachments"
          description="Upload the supporting files required to validate ownership and visually identify the asset."
        >
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <Field label="Invoice Attachment">
              <Button
                component="label"
                variant="outlined"
                fullWidth
                sx={{
                  textTransform: "none",
                  justifyContent: "flex-start",
                  color: "#374151",
                  borderColor: "#d1d5db",
                  bgcolor: "#fff",
                  borderRadius: "6px",
                  py: 1.1,
                }}
              >
                {invoiceFile ? invoiceFile.name : "Choose invoice file"}
                <input type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} />
              </Button>
            </Field>
            <Field label="Asset Image">
              <Button
                component="label"
                variant="outlined"
                fullWidth
                sx={{
                  textTransform: "none",
                  justifyContent: "flex-start",
                  color: "#374151",
                  borderColor: "#d1d5db",
                  bgcolor: "#fff",
                  borderRadius: "6px",
                  py: 1.1,
                }}
              >
                {imageFile ? imageFile.name : "Choose asset image"}
                <input type="file" hidden accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </Button>
            </Field>
            <Field label="QR Code Attachment">
              <Button
                component="label"
                variant="outlined"
                fullWidth
                sx={{
                  textTransform: "none",
                  justifyContent: "flex-start",
                  color: "#374151",
                  borderColor: "#d1d5db",
                  bgcolor: "#fff",
                  borderRadius: "6px",
                  py: 1.1,
                }}
              >
                {qrFile ? qrFile.name : "Choose QR file"}
                <input type="file" hidden accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
              </Button>
            </Field>
          </Box>
        </Section>

        <Paper sx={{ borderRadius: "6px", p: 2.2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ textTransform: "none", bgcolor: "#1e3a5f", "&:hover": { bgcolor: "#173255" }, px: 4, minWidth: 140 }}
            >
              {submitting ? "Saving..." : "Save Asset"}
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate("/assets")}
              sx={{ textTransform: "none", bgcolor: "#334155", "&:hover": { bgcolor: "#1f2937" }, px: 4, minWidth: 140 }}
            >
              Close
            </Button>
          </Stack>
          <Divider sx={{ mt: 2 }} />
        </Paper>
      </Stack>
    </Stack>
  );
}
