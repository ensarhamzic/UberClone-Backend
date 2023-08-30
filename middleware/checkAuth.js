const jwt = require("jsonwebtoken");

const checkAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = checkAuth;
