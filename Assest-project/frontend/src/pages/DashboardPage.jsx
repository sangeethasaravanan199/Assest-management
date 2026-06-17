import { useEffect, useState } from "react";
import { Alert, Paper, Stack, Typography } from "@mui/material";
import api from "../api/client";
import DashboardCards from "../components/DashboardCards";

export default function DashboardPage() {
  const [kpis, setKpis] = useState({});
  const [message, setMessage] = useState("Loading dashboard...");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data } = await api.get("/analytics/summary");
        if (mounted) {
          setKpis(data.kpis);
          setMessage("");
        }
      } catch (error) {
        if (mounted) {
          setMessage("Analytics summary is available for admin users only.");
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Stack spacing={2.5}>
      <BoxHeader title="Dashboard" subtitle="Operational summary of inventory and maintenance performance." />
      {message ? (
        <Alert severity="info">{message}</Alert>
      ) : (
        <>
          <DashboardCards kpis={kpis} />
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="body1" color="text.secondary">
              This dashboard is structured like a real enterprise overview: leadership sees current asset
              availability, maintenance backlog, and assignment pressure at a glance.
            </Typography>
          </Paper>
        </>
      )}
    </Stack>
  );
}

function BoxHeader({ title, subtitle }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">{subtitle}</Typography>
    </Paper>
  );
}
