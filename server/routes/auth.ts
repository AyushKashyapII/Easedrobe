import { Router } from 'express';
import passport from 'passport';
import { storage } from '../storage';
import { loginUserSchema, registerUserSchema } from '@shared/schema';
import { isAuthenticated } from '../auth';

const router = Router();

// Register route
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const parseResult = registerUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid data',
        errors: parseResult.error.errors
      });
    }

    const { confirmPassword, ...userData } = parseResult.data;

    // Check if username exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create user
    const user = await storage.createUser(userData);

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: info.message || 'Authentication failed' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json(user);
    });
  })(req, res, next);
});

// Logout route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
  res.json(req.user);
});

export default router;