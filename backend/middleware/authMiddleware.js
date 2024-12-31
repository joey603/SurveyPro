const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  console.log('authMiddleware appelé');
  console.log('Headers reçus:', req.headers);
  
  try {
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Pas de token Bearer trouvé');
      return res.status(401).json({ message: 'Token d\'authentification manquant' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extrait:', token ? 'Token présent' : 'Pas de token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token décodé:', decoded);

    req.user = decoded;
    console.log('User ajouté à la requête:', req.user);

    next();
  } catch (error) {
    console.error('Erreur dans authMiddleware:', error);
    res.status(401).json({ 
      message: 'Token invalide',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = authMiddleware;
