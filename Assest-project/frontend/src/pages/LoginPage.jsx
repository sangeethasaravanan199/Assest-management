import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import WorkspacesOutlinedIcon from "@mui/icons-material/WorkspacesOutlined";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 2, md: 4 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(155deg, #e8f7f5 0%, #f4f9ff 55%, #ecf4ff 100%)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1120,
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)",
        }}
      >
        <Grid container>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                minHeight: { xs: "auto", md: 680 },
                p: { xs: 3, md: 5 },
                background: "linear-gradient(145deg, #0f766e 0%, #0d9488 55%, #155fa0 100%)",
                color: "common.white",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Stack spacing={3}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <AccountBalanceOutlinedIcon sx={{ fontSize: 30 }} />
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    AssetPulse
                  </Typography>
                </Stack>

                <Typography variant="h5" sx={{ fontWeight: 700, maxWidth: 420 }}>
                  Company Access Portal
                </Typography>

                <Typography sx={{ opacity: 0.9, maxWidth: 480 }}>
                  Securely sign in to manage assets, assignments, maintenance workflows, and operational reporting.
                </Typography>

                <Stack spacing={1.25}>
                  {[
                    { icon: <VerifiedUserOutlinedIcon />, text: "Role-based secure authentication" },
                    { icon: <WorkspacesOutlinedIcon />, text: "Centralized asset lifecycle operations" },
                    { icon: <AccountBalanceOutlinedIcon />, text: "Audit-ready enterprise records" },
                  ].map((item) => (
                    <Stack
                      key={item.text}
                      direction="row"
                      spacing={1.2}
                      alignItems="center"
                      sx={{
                        p: 1.3,
                        borderRadius: "6px",
                        bgcolor: "rgba(255,255,255,0.13)",
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      <Box sx={{ display: "flex", opacity: 0.95 }}>{item.icon}</Box>
                      <Typography sx={{ fontWeight: 600 }}>{item.text}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                minHeight: { xs: "auto", md: 680 },
                p: { xs: 2.5, md: 4 },
                bgcolor: "#ffffff",
                display: "grid",
                placeItems: "center",
              }}
            >
              <LoginForm />
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
