import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Grid, Paper, Typography } from "@mui/material";

const colors = ["#0f766e", "#14b8a6", "#f59e0b", "#ef4444", "#2563eb", "#334155"];

export default function AnalyticsCharts({ data }) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Paper sx={{ p: 2.5, height: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Assets by Type
          </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.assetsByType}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#0f766e" />
          </BarChart>
        </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Paper sx={{ p: 2.5, height: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Asset Status Distribution
          </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data.assetsByStatus} dataKey="count" nameKey="status" outerRadius={92} label>
              {data.assetsByStatus.map((entry, idx) => (
                <Cell key={entry.status} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>
            Maintenance by Status
          </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.maintenanceByStatus}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
}
