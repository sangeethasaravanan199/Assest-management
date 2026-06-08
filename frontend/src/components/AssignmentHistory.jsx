import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

function fmt(dateStr) {
  if (!dateStr) return "—";
  return String(dateStr).slice(0, 10);
}

function StatusBadge({ returnedAt }) {
  if (returnedAt) {
    return (
      <Chip
        icon={<CheckCircleOutlineOutlinedIcon />}
        label="Returned"
        size="small"
        color="success"
        variant="outlined"
      />
    );
  }
  return (
    <Chip
      icon={<PendingOutlinedIcon />}
      label="Active"
      size="small"
      color="secondary"
      variant="outlined"
    />
  );
}

export default function AssignmentHistory({ assignments }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Box
          sx={{
            bgcolor: "primary.main",
            borderRadius: 2,
            p: 0.8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AssignmentTurnedInOutlinedIcon sx={{ color: "white", fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Assignment History
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {assignments.length} record{assignments.length !== 1 ? "s" : ""} — all asset-to-user
            assignments stored in the database
          </Typography>
        </Box>
      </Stack>

      {assignments.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 6,
            color: "text.secondary",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
          <Typography>No assignments yet. Assign an asset above to see it here.</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                {[
                  "#",
                  "Asset Tag",
                  "Asset Name",
                  "Type",
                  "Assigned To",
                  "Department",
                  "Assigned By",
                  "Assigned On",
                  "Expected Return",
                  "Returned On",
                  "Status",
                  "Notes",
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((row, idx) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{
                    "&:last-child td": { border: 0 },
                    bgcolor: row.returnedAt ? "transparent" : "rgba(13,148,136,0.03)",
                  }}
                >
                  <TableCell sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                      {row.assetTag}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{row.assetName}</TableCell>
                  <TableCell>
                    <Chip label={row.assetType} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                    {row.employeeName}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {row.employeeEmail}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                    {row.department || "—"}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                    {row.assignedByName}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(row.assignedAt)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(row.expectedReturnDate)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {row.returnedAt ? (
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                        {fmt(row.returnedAt)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge returnedAt={row.returnedAt} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, color: "text.secondary", fontSize: "0.75rem" }}>
                    {row.notes || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
