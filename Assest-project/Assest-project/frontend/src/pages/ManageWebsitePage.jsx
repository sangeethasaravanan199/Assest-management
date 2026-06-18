import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

const initialForm = {
  siteTitle: "AssetPulse",
  supportEmail: "support@assetpulse.local",
  theme: "teal",
  homepageMessage: "Track assets and maintenance from one command center.",
  maintenanceMode: false,
  footerText: "© 2026 AssetPulse. All rights reserved.",
};

function SectionCard({ title, description, children }) {
  return (
    <Card elevation={0} sx={{ p: 2.5, borderRadius: "8px", border: "1px solid", borderColor: "divider" }}>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{title}</Typography>
      <Typography sx={{ mt: 0.5, mb: 2, color: "#6b7280", fontSize: 14 }}>{description}</Typography>
      {children}
    </Card>
  );
}

export default function ManageWebsitePage() {
  const [form, setForm] = useState(initialForm);
  const [saved, setSaved] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const themePreview = useMemo(() => {
    if (form.theme === "ocean") return "linear-gradient(90deg, #0d9488 0%, #155fa0 100%)";
    if (form.theme === "emerald") return "linear-gradient(90deg, #047857 0%, #0f766e 100%)";
    return "linear-gradient(90deg, #0f766e 0%, #0ea5a4 100%)";
  }, [form.theme]);

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: "8px", border: "1px solid", borderColor: "divider" }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={1.5} sx={{ width: "100%" }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: { xs: 26, md: 30 }, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
              Manage Website
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#6b7280", fontSize: 15 }}>
              Configure website identity, theme defaults, and communication settings.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleSave}
            sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600, minWidth: 130, ml: "auto", alignSelf: { xs: "flex-end", sm: "center" } }}
          >
            Save Changes
          </Button>
        </Stack>
      </Paper>

      {saved ? <Alert severity="success">Website settings saved successfully.</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
        <SectionCard title="Site Identity" description="Basic information visible in headers, browser tabs, and emails.">
          <Stack spacing={2}>
            <TextField
              label="Site Title"
              value={form.siteTitle}
              onChange={(event) => updateField("siteTitle", event.target.value)}
              fullWidth
            />
            <TextField
              label="Support Email"
              value={form.supportEmail}
              onChange={(event) => updateField("supportEmail", event.target.value)}
              fullWidth
            />
            <TextField
              label="Homepage Message"
              value={form.homepageMessage}
              onChange={(event) => updateField("homepageMessage", event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </SectionCard>

        <SectionCard title="Appearance" description="Choose base theme and preview how it will look.">
          <Stack spacing={2}>
            <TextField
              select
              label="Theme Preset"
              value={form.theme}
              onChange={(event) => updateField("theme", event.target.value)}
              fullWidth
            >
              <MenuItem value="teal">Teal (Default)</MenuItem>
              <MenuItem value="ocean">Ocean</MenuItem>
              <MenuItem value="emerald">Emerald</MenuItem>
            </TextField>
            <Box sx={{ p: 2, borderRadius: "8px", color: "#ffffff", background: themePreview }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SettingsSuggestOutlinedIcon fontSize="small" />
                <Typography sx={{ fontWeight: 700 }}>{form.siteTitle || "Website Preview"}</Typography>
              </Stack>
              <Typography sx={{ mt: 0.75, fontSize: 13, opacity: 0.92 }}>
                {form.homepageMessage || "Live preview text"}
              </Typography>
            </Box>
          </Stack>
        </SectionCard>

        <SectionCard title="Operations" description="Control global operational behavior and communication footer.">
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.maintenanceMode}
                  onChange={(event) => updateField("maintenanceMode", event.target.checked)}
                />
              }
              label="Enable Maintenance Mode"
            />
            <TextField
              label="Footer Text"
              value={form.footerText}
              onChange={(event) => updateField("footerText", event.target.value)}
              fullWidth
            />
            <Alert severity={form.maintenanceMode ? "warning" : "info"}>
              {form.maintenanceMode
                ? "Maintenance mode is enabled. Visitors may see a temporary downtime banner."
                : "Website is operating normally for all users."}
            </Alert>
          </Stack>
        </SectionCard>
      </Box>
    </Stack>
  );
}
