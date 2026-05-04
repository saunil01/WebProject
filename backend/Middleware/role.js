// middleware/role.js
const role = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userRole = req.user.role || "user";

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          message: "Access denied: insufficient permissions",
        });
      }

      next();
    } catch (err) {
      console.error("Role verification error:", err);
      res.status(500).json({ message: "Error verifying role access" });
    }
  };
};

module.exports = role;