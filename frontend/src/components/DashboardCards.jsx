import { Box, Paper, Typography } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";

export default function DashboardCards({ kpis }) {
  const cards = [
    {
      label: "Total Assets",
      value: kpis.total_assets || 0,
      icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />,
      iconColor: "#0369a1",
      iconBg: "rgba(3, 105, 161, 0.12)",
    },
    {
      label: "Assigned",
      value: kpis.assigned_assets || 0,
      icon: <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 18 }} />,
      iconColor: "#6d28d9",
      iconBg: "rgba(109, 40, 217, 0.12)",
    },
    {
      label: "Available",
      value: kpis.available_assets || 0,
      icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
      iconColor: "#0f766e",
      iconBg: "rgba(15, 118, 110, 0.12)",
    },
    {
      label: "Retired",
      value: kpis.retired_assets || 0,
      icon: <ArchiveOutlinedIcon sx={{ fontSize: 18 }} />,
      iconColor: "#b45309",
      iconBg: "rgba(180, 83, 9, 0.12)",
    },
    {
      label: "Open Maintenance",
      value: kpis.open_maintenance || 0,
      icon: <BuildCircleOutlinedIcon sx={{ fontSize: 18 }} />,
      iconColor: "#be123c",
      iconBg: "rgba(190, 18, 60, 0.12)",
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        },
      }}
    >
      {cards.map((card) => (
        <Paper key={card.label} sx={{ p: 2.5, height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.6 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.2,
                bgcolor: card.iconBg,
                color: card.iconColor,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </Box>
            <Typography color="text.secondary" variant="body2">
              {card.label}
            </Typography>
          </Box>
          <Typography variant="h4">{card.value}</Typography>
        </Paper>
      ))}
    </Box>
  );
}
