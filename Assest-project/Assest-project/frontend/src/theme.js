import { alpha, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f766e",
      dark: "#115e59",
      light: "#5eead4",
    },
    secondary: {
      main: "#2563eb",
    },
    background: {
      default: "#f5f7fb",
      paper: "#ffffff",
    },
    success: {
      main: "#15803d",
    },
    warning: {
      main: "#d97706",
    },
    error: {
      main: "#dc2626",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: -1,
    },
    h2: {
      fontWeight: 700,
      letterSpacing: -0.4,
    },
    h3: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: `linear-gradient(90deg, #0f766e 0%, ${alpha("#2563eb", 0.92)} 100%)`,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 0,
        },
        columnHeaders: {
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        },
      },
    },
  },
});

export default theme;
