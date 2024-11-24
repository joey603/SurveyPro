const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Récupère le token depuis le header Authorization

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Vérifie et décode le token
    req.user = decoded; // Ajoute les informations utilisateur à la requête
    next();
  } catch (error) {
    console.error('Authentication error: ', error.message);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
