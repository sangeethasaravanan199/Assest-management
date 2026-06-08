import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import DevicesOutlinedIcon from "@mui/icons-material/DevicesOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import MiscellaneousServicesOutlinedIcon from "@mui/icons-material/MiscellaneousServicesOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import SubtitlesOutlinedIcon from "@mui/icons-material/SubtitlesOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Tooltip,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

const navItems = [
  { key: "dashboard", to: "/dashboard", label: "Dashboard", icon: <HomeOutlinedIcon /> },
  { key: "asset", to: "/assets", label: "Asset", icon: <DevicesOutlinedIcon /> },
  { key: "asset-stock", to: "/assets/add-stock", label: "Stock", icon: <Inventory2OutlinedIcon /> },
  { key: "audit", to: "/audit", label: "Audit", icon: <FactCheckOutlinedIcon /> },
  { key: "asset-sub-categories", to: "/assets/sub-categories", label: "Asset Sub Categories", icon: <SubtitlesOutlinedIcon /> },
  { key: "asset-history", to: "/assets/history", label: "Asset History", icon: <SubtitlesOutlinedIcon /> },
  { key: "asset-status", to: "/assets/status", label: "Asset Status", adminOnly: true, icon: <FactCheckOutlinedIcon /> },
  {
    key: "manage-employee",
    label: "Manage Employee",
    adminOnly: true,
    icon: <ManageAccountsOutlinedIcon />,
    expandable: true,
    children: [
      { key: "department", to: "/admin/departments", label: "Department", icon: <ApartmentOutlinedIcon /> },
      { key: "sub-department", to: "/admin/sub-departments", label: "Sub Department", icon: <BadgeOutlinedIcon /> },
      { key: "employee", to: "/admin/users", label: "Employee", icon: <PeopleAltOutlinedIcon /> },
    ],
  },
  {
    key: "request-module",
    label: "Request Module",
    icon: <MiscellaneousServicesOutlinedIcon />,
    expandable: true,
    children: [
      { key: "maintenance-requests", to: "/maintenance", label: "Maintenance Requests", icon: <MiscellaneousServicesOutlinedIcon /> },
      { key: "manage-supplier", to: "/maintenance?view=supplier", label: "Manage Supplier", icon: <BusinessOutlinedIcon /> },
    ],
  },
  { key: "report", to: "/analytics", label: "Report", adminOnly: true, icon: <StorageOutlinedIcon /> },
  { key: "manage-website", to: "/manage-website", label: "Manage Website", icon: <SettingsOutlinedIcon /> },
];

const drawerWidthExpanded = 260;
const drawerWidthCollapsed = 64;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerWidth = sidebarOpen ? drawerWidthExpanded : drawerWidthCollapsed;
  const [selectedNavKey, setSelectedNavKey] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({ "manage-employee": true, "request-module": true });
  const [adminNotifOpen, setAdminNotifOpen] = useState(false);
  const [adminNotifCount, setAdminNotifCount] = useState(0);

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.adminOnly || user?.role === "admin"),
    [user?.role]
  );

  useEffect(() => {
    const isMatch = (to) => {
      if (!to) return false;
      const [path, rawQuery] = to.split("?");
      if (path !== location.pathname) return false;
      if (!rawQuery) return true;
      const current = new URLSearchParams(location.search);
      const required = new URLSearchParams(rawQuery);
      for (const [key, value] of required.entries()) {
        if (current.get(key) !== value) return false;
      }
      return true;
    };

    // Check top-level items
    const firstMatch = visibleNavItems.find((item) => isMatch(item.to));
    if (firstMatch) { setSelectedNavKey(firstMatch.key); return; }
    // Check children
    for (const item of visibleNavItems) {
      if (item.children) {
        const child = item.children.find((c) => isMatch(c.to));
        if (child) { setSelectedNavKey(child.key); return; }
      }
    }
  }, [location.pathname, location.search, visibleNavItems]);

  useEffect(() => {
    async function checkAdminNotifications() {
      if (String(user?.role || "").toLowerCase() !== "admin" || !user?.id) return;
      try {
        const { data } = await api.get("/maintenance");
        const openCount = (Array.isArray(data) ? data : []).filter(
          (item) => String(item.status || "").toLowerCase() !== "resolved"
        ).length;
        if (openCount > 0) {
          setAdminNotifCount(openCount);
          setAdminNotifOpen(true);
        }
      } catch {
        // Keep layout stable even if notification fetch fails.
      }
    }

    checkAdminNotifications();
  }, [user?.id, user?.role]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: "width 0.22s ease",
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            px: sidebarOpen ? 1.5 : 0.75,
            py: 2,
            background: "linear-gradient(180deg, #0f766e 0%, #0d9488 45%, #155fa0 100%)",
            color: "#e9f8f6",
            overflowX: "hidden",
            transition: "width 0.22s ease, padding 0.22s ease",
          },
        }}
      >
        <Stack sx={{ height: "100%", gap: 0 }}>
          {/* Logo + Toggle */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? "space-between" : "center",
              mb: 2.5,
              px: sidebarOpen ? 0.5 : 0,
              minHeight: 48,
            }}
          >
            {sidebarOpen && (
              <Box sx={{ overflow: "hidden" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", fontSize: 16 }}>
                  AssetPulse
                </Typography>
                <Typography sx={{ fontSize: 11, color: "rgba(214,227,241,0.75)", whiteSpace: "nowrap" }}>
                  Electronic Asset Management
                </Typography>
              </Box>
            )}
            <Tooltip title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} placement="right">
              <Box
                onClick={() => setSidebarOpen((v) => !v)}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                }}
              >
                {sidebarOpen
                  ? <ChevronLeftOutlinedIcon sx={{ fontSize: 18, color: "#fff" }} />
                  : <ChevronRightOutlinedIcon sx={{ fontSize: 18, color: "#fff" }} />}
              </Box>
            </Tooltip>
          </Box>

          <List disablePadding sx={{ display: "grid", gap: 0.5, flex: 1, alignContent: "start" }}>
          {visibleNavItems.map((item) => {
            if (item.expandable) {
              const isOpen = !!expandedGroups[item.key] && sidebarOpen;
              return (
                <Box key={item.key}>
                  <Tooltip title={!sidebarOpen ? item.label : ""} placement="right" disableInteractive>
                    <ListItemButton
                      onClick={() => sidebarOpen ? toggleGroup(item.key) : setSidebarOpen(true)}
                      sx={{
                        borderRadius: 2,
                        px: sidebarOpen ? 1.2 : 1,
                        py: 0.9,
                        justifyContent: sidebarOpen ? "flex-start" : "center",
                        color: "#e9f8f6",
                        "& .MuiListItemIcon-root": { color: "#e9f8f6" },
                        "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: sidebarOpen ? 36 : 0, justifyContent: "center" }}>{item.icon}</ListItemIcon>
                      {sidebarOpen && (
                        <>
                          <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500, noWrap: true }} />
                          {isOpen ? <ExpandLessOutlinedIcon sx={{ fontSize: 18, opacity: 0.9 }} /> : <ExpandMoreOutlinedIcon sx={{ fontSize: 18, opacity: 0.9 }} />}
                        </>
                      )}
                    </ListItemButton>
                  </Tooltip>
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pl: 2, display: "grid", gap: 0.5, mt: 0.5 }}>
                      {item.children.map((child) => (
                        <Tooltip key={child.key} title={child.label} placement="right" disableInteractive>
                          <ListItemButton
                            component={NavLink}
                            to={child.to}
                            selected={selectedNavKey === child.key}
                            onClick={() => setSelectedNavKey(child.key)}
                            sx={{
                              borderRadius: 2, px: 1, py: 0.75, color: "#e9f8f6",
                              "& .MuiListItemIcon-root": { color: "#e9f8f6" },
                              "&.Mui-selected": {
                                bgcolor: "rgba(255,255,255,0.17)", color: "#ffffff",
                                "& .MuiListItemIcon-root": { color: "#ffffff" },
                              },
                              "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                              "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,0.24)" },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 30 }}>{child.icon}</ListItemIcon>
                            <ListItemText
                              primary={child.label}
                              primaryTypographyProps={{ fontSize: 13, fontWeight: 500, noWrap: true }}
                            />
                          </ListItemButton>
                        </Tooltip>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              );
            }
            return (
              <Tooltip key={`${item.label}-${item.to || ""}`} title={!sidebarOpen ? item.label : ""} placement="right" disableInteractive>
                <ListItemButton
                  component={NavLink}
                  to={item.to}
                  selected={selectedNavKey === item.key}
                  onClick={() => setSelectedNavKey(item.key)}
                  sx={{
                    borderRadius: 2,
                    px: sidebarOpen ? 1.2 : 1,
                    py: 0.9,
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    color: "#e9f8f6",
                    "& .MuiListItemIcon-root": { color: "#e9f8f6" },
                    "&.Mui-selected": {
                      bgcolor: "rgba(255,255,255,0.17)",
                      color: "#ffffff",
                      "& .MuiListItemIcon-root": { color: "#ffffff" },
                    },
                    "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                    "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,0.24)" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: sidebarOpen ? 36 : 0, justifyContent: "center" }}>{item.icon}</ListItemIcon>
                  {sidebarOpen && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: 14, fontWeight: 500, noWrap: true }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
          </List>
        </Stack>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: "linear-gradient(145deg, #0f766e 0%, #0d9488 55%, #155fa0 100%)",
            color: "#ffffff",
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6">Operations Workspace</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Live asset, maintenance, and analytics controls
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
                  {user?.name?.[0] || "U"}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={700}>
                    {user?.name}
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: "capitalize", opacity: 0.85 }}>
                    {user?.role}
                  </Typography>
                </Box>
              </Stack>
              <Button color="inherit" variant="outlined" startIcon={<LogoutOutlinedIcon />} onClick={logout}>
                Logout
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>

      <Snackbar
        open={adminNotifOpen}
        autoHideDuration={5000}
        onClose={() => setAdminNotifOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setAdminNotifOpen(false)}
          action={
            <Stack direction="row" spacing={0.75}>
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setAdminNotifOpen(false);
                  navigate("/maintenance");
                }}
                sx={{ fontWeight: 700, textTransform: "none", minWidth: 0 }}
              >
                Open
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={() => setAdminNotifOpen(false)}
                sx={{ fontWeight: 700, textTransform: "none", minWidth: 0 }}
              >
                Close
              </Button>
            </Stack>
          }
          sx={{ width: "100%", alignItems: "center" }}
        >
          {adminNotifCount} maintenance request(s) need admin attention.
        </Alert>
      </Snackbar>
    </Box>
  );
}
