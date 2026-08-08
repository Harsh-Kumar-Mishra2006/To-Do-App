const jwt = require('jsonwebtoken');  // ✅ Import JWT

const authenticateToken = (req, res, next) => {
  try {
    // Get token from header or cookies
    let token = req.header('Authorization') || req.cookies?.token;  // ✅ Fixed spelling

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Clean token - remove Bearer prefix and quotes
    token = token.replace('Bearer ', '').trim();  // ✅ Fixed
    token = token.replace(/^["']|["']$/g, '');

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'mypassword');  // ✅ Fixed

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Attach user to request
    req.user = verified;
    next();

  } catch (error) {
    console.log('Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

//requirerole
const requireRole= (roles) =>{
  return (req,res,next)=>{
    //checks authenticity of user
    if(!req.user){
      return res.status(401).json({
        success: false,
        message: "error not autherised"
      })
    }
    
    //checks existence of roles
    if(!roles.includes(req.user.role)){
      return res.status(403).json({
        success: false,
        message: "access denied"
      })
    }
    next();
  }
}


module.exports = { authenticateToken,requireRole };