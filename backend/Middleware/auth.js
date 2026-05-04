const jwt = require("jsonwebtoken");

// Middleware to authenticate requests using JWT
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
      }

      // Attach decoded token data (user_id, role, etc.) to the request
      req.user = decodedUser;
      next();
    });
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(500).json({ message: "Internal server error during authentication." });
  }
};

module.exports = { authenticateToken };