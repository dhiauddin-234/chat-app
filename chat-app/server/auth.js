const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// In-memory user storage for development (fallback when MongoDB is not available)
const users = new Map();
let userIdCounter = 1;

// Create a default test user for easy testing
const createDefaultUser = async () => {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 12);
  const defaultUser = {
    id: userIdCounter++,
    username: 'testuser',
    email: 'test@example.com',
    password: hashedPassword,
    createdAt: new Date(),
    lastActive: new Date()
  };
  users.set(defaultUser.id, defaultUser);
  console.log('Default test user created: test@example.com / password123');
};

// Initialize default user
createDefaultUser();

// Generate JWT token
const generateToken = (userId, email) => {
  // Provide safe defaults for development if env vars are missing
  const secret = process.env.JWT_SECRET || 'dev_secret_key_change_me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { userId, email },
    secret,
    { expiresIn }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_key_change_me';
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

// Validation middleware
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('username')
    .isLength({ min: 2, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 2-20 characters and contain only letters, numbers, and underscores')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists in memory
    const emailLower = email.toLowerCase();
    const existingUser = Array.from(users.values()).find(
      user => user.email === emailLower || user.username === username
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in memory
    const userId = userIdCounter++;
    const newUser = {
      id: userId,
      username: username.trim(),
      email: emailLower.trim(),
      password: hashedPassword,
      createdAt: new Date(),
      lastActive: new Date()
    };

    users.set(userId, newUser);

    // Generate token
    const token = generateToken(userId, newUser.email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user in memory
    const emailLower = email.toLowerCase();
    const user = Array.from(users.values()).find(
      user => user.email === emailLower
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last active
    user.lastActive = new Date();

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  req.user = decoded;
  next();
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = users.get(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  authenticateToken,
  validateRegistration,
  validateLogin,
  verifyToken,
  users
};
