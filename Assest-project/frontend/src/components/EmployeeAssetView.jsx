import { useEffect, useState } from "react";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DevicesOtherOutlinedIcon from "@mui/icons-material/DevicesOtherOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/client";

function fmt(d) {
  if (!d) return "—";
  return String(d).slice(0, 10);
}

const typeColor = {
  laptop: "#0f766e",
  desktop: "#0369a1",
  monitor: "#7c3aed",
  printer: "#b45309",
  network_device: "#be185d",
};

function AssetCard({ item }) {
  const color = typeColor[item.assetType] || "#374151";
  const active = !item.returnedAt;
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: active ? "primary.main" : "divider",
        bgcolor: active ? "rgba(13,148,136,0.04)" : "transparent",
        minWidth: 220,
        flex: "1 1 220px",
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Box
            sx={{
              bgcolor: color,
              borderRadius: 1.5,
              px: 1,
              py: 0.3,
            }}
          >
            <Typography variant="caption" sx={{ color: "white", fontWeight: 700, fontSize: "0.65rem" }}>
              {item.assetType?.replace("_", " ").toUpperCase()}
            </Typography>
          </Box>
          {active ? (
            <Chip icon={<PendingOutlinedIcon />} label="Active" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
          ) : (
            <Chip icon={<CheckCircleOutlineOutlinedIcon />} label="Returned" size="small" color="default" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
          )}
        </Stack>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
          {item.assetTag}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5, color: "text.primary" }}>
          {item.assetName}
        </Typography>

        <Stack spacing={0.4}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <LocationOnOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">{item.location || "—"}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">Assigned: {fmt(item.assignedAt)}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <DevicesOtherOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">Return by: {fmt(item.expectedReturnDate)}</Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function EmployeeAssetView({ employees }) {
  const [selectedId, setSelectedId] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!selectedId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    setErr("");
    api
      .get("/assets/assignments", { params: { employeeId: selectedId } })
      .then((res) => setAssignments(res.data))
      .catch(() => setErr("Failed to load assignments for this employee."))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const employee = employees.find((e) => String(e.id) === String(selectedId));
  const active = assignments.filter((a) => !a.returnedAt);
  const history = assignments.filter((a) => a.returnedAt);

  return (
    <Paper sx={{ p: 2.5 }}>
      {/* Section header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #0f766e, #0d9488)",
            borderRadius: 2,
            p: 0.8,
            display: "flex",
            alignItems: "center",
          }}
        >
          <AccountCircleOutlinedIcon sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            View Assets by Employee
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select an employee to see all assets assigned to them
          </Typography>
        </Box>
      </Stack>

      {/* Employee picker */}
      <TextField
        label="Select Employee"
        select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        sx={{ maxWidth: 420, mb: 3 }}
        fullWidth
        size="small"
      >
        <MenuItem value="">— Choose an employee —</MenuItem>
        {employees.map((emp) => (
          <MenuItem key={emp.id} value={emp.id}>
            {emp.name}
            {emp.department ? ` (${emp.department})` : ""}
          </MenuItem>
        ))}
      </TextField>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {/* Employee profile card */}
      {employee && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: "rgba(13,148,136,0.04)", borderColor: "primary.light" }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48, fontWeight: 700 }}>
              {employee.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{employee.name}</Typography>
              <Typography variant="body2" color="text.secondary">{employee.email}</Typography>
              {employee.department && (
                <Chip label={employee.department} size="small" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: "0.65rem" }} />
              )}
            </Box>
            <Box sx={{ ml: "auto", textAlign: "right" }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
                {active.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">active asset{active.length !== 1 ? "s" : ""}</Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* No employee selected */}
      {!selectedId && (
        <Box
          sx={{
            textAlign: "center",
            py: 5,
            color: "text.secondary",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <AccountCircleOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
          <Typography>Select an employee above to view their assigned assets.</Typography>
        </Box>
      )}

      {selectedId && !loading && (
        <Stack spacing={3}>
          {/* Active assets */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Currently Assigned
              </Typography>
              <Chip label={active.length} size="small" color={active.length > 0 ? "secondary" : "default"} />
            </Stack>
            {active.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No active assets currently assigned to this employee.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {active.map((item) => (
                  <AssetCard key={item.id} item={item} />
                ))}
              </Box>
            )}
          </Box>

          <Divider />

          {/* Assignment history */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Assignment History
              </Typography>
              <Chip label={assignments.length} size="small" variant="outlined" />
            </Stack>

            {assignments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No assignment history found.
              </Typography>
            ) : (
              <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.50" }}>
                      {["Asset Tag", "Name", "Type", "Location", "Assigned By", "Assigned On", "Expected Return", "Returned On", "Notes", "Status"].map((h) => (
                        <TableCell
                          key={h}
                          sx={{ fontWeight: 700, fontSize: "0.73rem", color: "text.secondary", whiteSpace: "nowrap" }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((row) => (
                      <TableRow key={row.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                            {row.assetTag}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{row.assetName}</TableCell>
                        <TableCell>
                          <Chip label={row.assetType} size="small" variant="outlined" sx={{ fontSize: "0.68rem" }} />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{row.location || "—"}</TableCell>
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{row.assignedByName}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(row.assignedAt)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(row.expectedReturnDate)}</TableCell>
                        <TableCell>
                          {row.returnedAt ? (
                            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                              {fmt(row.returnedAt)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: "0.73rem", maxWidth: 160 }}>
                          {row.notes || "—"}
                        </TableCell>
                        <TableCell>
                          {row.returnedAt ? (
                            <Chip icon={<CheckCircleOutlineOutlinedIcon />} label="Returned" size="small" color="success" variant="outlined" />
                          ) : (
                            <Chip icon={<PendingOutlinedIcon />} label="Active" size="small" color="secondary" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
