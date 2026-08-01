import express from 'express';
import {
  signup,
  login,
  refreshToken,
  resetPassword,
  forgotPassword,
  deleteUser,
  verifyEmail,
  resendVerificationEmail
 
} from '../controllers/authController.js';

const router = express.Router();

// Signup route
router.post('/signup', signup);

// Login route
router.post('/login', login);

// Refresh Token route
router.post('/refresh', refreshToken);

// Forgot Password route
router.post('/forgotpassword', forgotPassword);

// Reset Password route
router.put('/resetpassword', resetPassword);

// Delete User route
router.post('/deleteuser', deleteUser);

// Verify Email route
router.get('/verifyemail/:token', verifyEmail);

// Resend Verification Email route
router.post('/resendverification', resendVerificationEmail);




export default router;