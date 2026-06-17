const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const queryToken = typeof req.query?.token === "string" ? req.query.token : "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (queryToken || null);

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
