import { useEffect, useState } from "react";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [robotVerified, setRobotVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setForm((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (!robotVerified) {
      setError("Please verify that you are not a robot");
      return;
    }

    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    const result = await login(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  return (
    <>
      <Card
        sx={{
          width: "100%",
          maxWidth: 500,
          borderRadius: "6px",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 26px rgba(15, 23, 42, 0.10)",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack component="form" spacing={2.2} onSubmit={onSubmit}>
            <Stack spacing={0.3} sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: { xs: 28, md: 32 }, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                Company Sign In
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use your corporate email and password to continue.
              </Typography>
            </Stack>

          <TextField
            label="Email address"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Enter Your Email"
            size="small"
            fullWidth
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Enter Your Password"
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "6px" } }}
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <FormControlLabel
              control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" />}
              label="Remember me"
              sx={{ m: 0 }}
            />
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              onClick={() => setError("Forgot password flow can be enabled after email service setup.")}
            >
              Forgot Password?
            </Link>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 1.4,
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "#fff",
            }}
          >
            <FormControlLabel
              control={<Checkbox checked={robotVerified} onChange={(e) => setRobotVerified(e.target.checked)} />}
              label="I'm not a robot"
              sx={{ m: 0 }}
            />
            <Stack spacing={0.2} alignItems="center" sx={{ minWidth: 88 }}>
              <Box
                component="img"
                src="/captcha-mark.svg"
                alt="reCAPTCHA"
                sx={{ width: 34, height: 34, objectFit: "contain", mb: 0.2 }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                reCAPTCHA
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: "text.disabled" }}>
                Privacy - Terms
              </Typography>
            </Stack>
          </Paper>

          {error ? <Alert severity="error">{error}</Alert> : null}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={<LoginOutlinedIcon />}
              sx={{
                height: 46,
                borderRadius: "6px",
                textTransform: "none",
                fontWeight: 700,
                fontSize: 16,
                bgcolor: "#00695c",
                "&:hover": { bgcolor: "#004d40" },
              }}
            >
              {loading ? "Signing in..." : "Login"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
