const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token décodé dans middleware auth:', decoded);
    
    // Vérifier si le token utilise l'ancien format (id) ou le nouveau (userId)
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Format de token invalide' });
    }
    
    const user = await User.findById(userId);

    if (!user) {
      // L'utilisateur n'existe plus dans la base de données
      return res.status(401).json({ 
        message: 'Utilisateur non trouvé',
        clearTokens: true // Indication au frontend de supprimer les tokens
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(401).json({ message: 'Non autorisé' });
  }
};

module.exports = authMiddleware; 