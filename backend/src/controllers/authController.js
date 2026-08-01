import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import Role1 from "../models/userModel.js";
import Role2 from "../models/userModel.js";
// Helper functions to sign tokens
export const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

// // Signup function
// export const signup = async (req, res) => {
//   const { fullName, email, password, confirmPassword } = req.body;

//   if (password !== confirmPassword) {
//     return res.status(400).json({ status: 'fail', message: 'Passwords do not match' });
//   }

//   try {
//     const newUser = await User.create({ fullName, email, password, role: 'user' });
//     const token = signToken(newUser._id);
//     const refreshToken = signRefreshToken(newUser._id);
//     res.status(201).json({ status: 'success', token, refreshToken });
//   } catch (err) {
//     res.status(400).json({ status: 'fail', message: err.message });
//   }
// };

// // Login function
// export const login = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ status: 'fail', message: 'Please provide email and password!' });
//   }

//   const user = await User.findOne({ email }).select('+password');
//   if (!user || !(await user.correctPassword(password, user.password))) {
//     return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
//   }

//   const token = signToken(user._id);
//   const refreshToken = signRefreshToken(user._id);
//   const refreshTokenExpiry = durationToMilliseconds(process.env.JWT_REFRESH_EXPIRES_IN);

//   res.cookie('refreshToken', refreshToken, {
//     httpOnly: true,
//     secure: false,
//     sameSite: 'none',
//     maxAge: refreshTokenExpiry,
//   });

//   res.status(200).json({ status: 'success', token, refreshToken, role: user.role });
// };

// Email transporter setup
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Updated Signup function
import School from '../models/schoolModel.js';
import Department from '../models/departmentModel.js';
export const signup = async (req, res) => {
  const { fullName, email, password, confirmPassword, role, school, collegeRollNo, department } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({
      status: "fail",
      message: "Passwords do not match",
    });
  }

  let newUser;
  try {
    // Allowed public signup roles: student, teacher, user
    const allowedRoles = ["user", "teacher", "student"];
    const chosenRole = allowedRoles.includes(String(role)) ? String(role) : "student";

    // Validate school/roll depending on role
    if (chosenRole === 'student') {
      if (!school || !collegeRollNo) return res.status(400).json({ status: 'fail', message: 'school and collegeRollNo are required for students' });
      // ensure school exists
      const schoolDoc = await School.findById(school);
      if (!schoolDoc) return res.status(400).json({ status: 'fail', message: 'Invalid school id' });
      // ensure unique roll per school
      const existing = await User.findOne({ school, collegeRollNo });
      if (existing) return res.status(400).json({ status: 'fail', message: 'collegeRollNo already registered for this school' });

      // The signup form makes department required and sends it, but it used to
      // be dropped here, so every student was created without one.
      if (!department) {
        return res.status(400).json({ status: 'fail', message: 'department is required for students' });
      }
      const departmentDoc = await Department.findById(department);
      if (!departmentDoc) {
        return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
      }
      // A department belongs to a school; picking one from a different school
      // would put the student outside their own tenant.
      if (String(departmentDoc.school) !== String(school)) {
        return res.status(400).json({ status: 'fail', message: 'Department does not belong to the selected school' });
      }
    }

    if (chosenRole === 'teacher') {
      if (!school) return res.status(400).json({ status: 'fail', message: 'school is required for teachers' });
      const schoolDoc = await School.findById(school);
      if (!schoolDoc) return res.status(400).json({ status: 'fail', message: 'Invalid school id' });
    }

    // Create user (email not verified initially)
    newUser = await User.create({
      fullName,
      email,
      password,
      role: chosenRole,
      school: school || undefined,
      department: department || undefined,
      collegeRollNo: collegeRollNo || undefined,
      isEmailVerified: false,
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    // Set verification token and expiration (24 hours)
    newUser.emailVerificationToken = hashedToken;
    newUser.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await newUser.save();

    // Send verification email.
    //
    // A mail outage is not the registrant's fault. Deleting the account and
    // returning a 500 left them with no way forward and no way to retry, so the
    // account is kept and they are told to request a new link instead. The
    // account still cannot be used until it is verified.
    let emailSent = true;
    let emailError = null;
    try {
      await sendVerificationEmail(
        newUser.email,
        verificationToken,
        newUser.fullName
      );
    } catch (emailErr) {
      emailSent = false;
      emailError = emailErr.message;
      console.error(`[signup] Verification email to ${newUser.email} failed:`, emailErr.message);
      // Log the link so a developer with no SMTP configured can still verify.
      console.error(
        `[signup] Verification link: ${process.env.FRONTEND_URL}/verify-email/${verificationToken}`
      );
    }

    // Return success without tokens (user needs to verify email first)
    res.status(201).json({
      status: "success",
      message: emailSent
        ? "Registration successful! Please check your email to verify your account."
        : "Account created, but the verification email could not be sent. Use 'resend verification email', or ask an administrator to verify the account.",
      requiresVerification: true,
      emailSent,
      // Only ever expose the link outside production, where it is a convenience
      // for local testing rather than a way to bypass email ownership.
      ...(!emailSent && process.env.NODE_ENV !== "production"
        ? {
            devVerificationUrl: `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`,
            devEmailError: emailError,
          }
        : {}),
    });
  } catch (err) {
    // If user was created but something else failed, clean up
    if (newUser && newUser._id) {
      await User.deleteOne({ _id: newUser._id });
    }
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Send verification email
const sendVerificationEmail = async (email, token, fullName) => {
  const transporter = createTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: "Verify Your Email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to our ShikshyakAI, ${fullName}!</h2>
        <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p><strong>Note:</strong> This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Email verification endpoint
export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    // Hash the token to compare with stored token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid or expired verification token",
      });
    }

    // Mark email as verified and clear verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate tokens for immediate login
    const authToken = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    res.status(200).json({
      status: "success",
      message: "Email verified successfully!",
      token: authToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        hasCompletedBookSelection: user.hasCompletedBookSelection,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Updated Login function
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide email and password!",
    });
  }

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect email or password",
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        status: "fail",
        message: "Please verify your email address before logging in.",
        requiresVerification: true,
      });
    }

    // Check if user or their school is blocked
    if (user.isBlocked) {
      return res.status(403).json({ status: 'fail', message: 'Your account is blocked. Contact support.' });
    }

    if (user.school) {
      const schoolDoc = await School.findById(user.school);
      if (schoolDoc && schoolDoc.isBlocked) {
        return res.status(403).json({ status: 'fail', message: 'Your school is blocked. Contact support.' });
      }
    }

    const token = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    const refreshTokenExpiry = durationToMilliseconds(
      process.env.JWT_REFRESH_EXPIRES_IN
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: refreshTokenExpiry,
    });

    const userResponse = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      hasCompletedBookSelection: user.hasCompletedBookSelection,
      schoolId: user.school,
    };

    // Department belongs to students and teachers too, not only HODs - gating
    // this on the HOD role is why a student could never see their department.
    if (user.department) {
      const department = await Department.findById(user.department).select('name');
      userResponse.departmentId = user.department;
      if (department) {
        userResponse.departmentName = department.name;
      }
    }

    res.status(200).json({
      status: "success",
      token,
      refreshToken,
      role: user.role,
      user: userResponse,
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Resend verification email
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide email address",
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "No user found with this email address",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        status: "fail",
        message: "Email is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(user.email, verificationToken, user.fullName);

    res.status(200).json({
      status: "success",
      message: "Verification email sent successfully",
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Token duration helper
export const durationToMilliseconds = (duration) => {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
};

// Refresh Token function
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ status: "fail", message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newToken = signToken(decoded.id);
    res.status(200).json({ status: "success", token: newToken });
  } catch (err) {
    res.status(401).json({ status: "fail", message: "Invalid refresh token" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ status: "fail", message: "Please provide your email address." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({
          status: "fail",
          message: "No user found with this email address.",
        });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token expiration time (1 hour)
    const resetPasswordExpires = Date.now() + 3600000;

    // Save token and expiration to the user's document
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Send reset link via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject: "Password Reset Request",
      text: `You requested a password reset. Please click the link below to reset your password: \n\n ${resetUrl} \n\n If you did not request this, please ignore this email.`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({
        status: "success",
        message: "Password reset link sent to your email address.",
      });
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  // Validate that passwords match
  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ status: "fail", message: "Passwords do not match" });
  }

  try {
    // Hash the token to compare with the stored reset token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find the user with the matching token and check if it is expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure the token has not expired
    });

    if (!user) {
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid or expired reset token" });
    }

    // Update the user's password and clear the reset token fields
    user.password = newPassword;
    user.resetPasswordToken = undefined; // Clear the reset token
    user.resetPasswordExpires = undefined; // Clear the expiration date
    await user.save();

    res
      .status(200)
      .json({ status: "success", message: "Password successfully updated" });
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
};

// Delete User Account by Email and Password
export const deleteUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({
        status: "fail",
        message: "Please provide both email and password",
      });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email }).select("+password"); // Ensure password is included in the result

    if (!user) {
      return res
        .status(404)
        .json({
          status: "fail",
          message: "No user found with this email address",
        });
    }

    // Verify if the provided password matches the stored password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ status: "fail", message: "Incorrect password" });
    }

    // 1. Delete related data in Role1 model if the user is a Role1
    if (user.role === "Role1") {
      const Role1 = await Role1.findOneAndDelete({ _id: user._id });
      if (Role1) {
        console.log(`Role1 account with userId ${user._id} has been deleted.`);
      }
    }

    // 2. Delete related data in Role2 model if the user is a Role2
    if (user.role === "Role2") {
      const Role2 = await Role2.findOneAndDelete({ userId: user._id });
      if (Role2) {
        console.log(`Role2 account with userId ${user._id} has been deleted.`);
      }
    }

    // 3. Delete the user from the database using deleteOne()
    await User.deleteOne({ _id: user._id });
    // Send success response
    res
      .status(200)
      .json({
        status: "success",
        message: "User account deleted successfully",
      });
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
};