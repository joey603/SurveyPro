const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1]; // Extract the token

  if (!token) {
    console.error("Access denied. No token provided.");
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    req.user = decoded; // Attach the decoded token to the request

    // Log the authenticated user
    console.log("Authenticated user:", req.user);

    next(); // Proceed to the next middleware
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = authMiddleware;
