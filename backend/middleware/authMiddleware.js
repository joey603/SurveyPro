const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  try {
    // Log pour le débogage
    console.log('Auth Headers:', req.headers);
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('No Authorization header found');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Vérifier le format du header
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid Authorization header format');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('No token found after Bearer');
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);
      req.user = decoded;
      next();
    } catch (error) {
      console.log('Token verification failed:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error in auth middleware' });
  }
};

module.exports = authMiddleware;
