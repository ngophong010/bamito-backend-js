const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../config/connectDB.js");
const { Op } = require("sequelize");
const { User, Role } = require("../models");

// --- Import low-level utilities ---
const { hashPassword, comparePassword } = require("../utils/password.js");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt.js");
const emailService = require("../utils/email.js");

/**
 * JSDoc type definition for editor autocompletion.
 * This imports the type directly from the Prisma client.
 * @typedef {import('@prisma/client').Prisma.UserCreateInput} UserCreateInput
 */

/**
 * Verifies user credentials and issues JWTs.
 * @param {string} email The user's email address.
 * @param {string} password The user's raw password.
 * @returns {Promise<{user: object, accessToken: string, refreshToken: string}>} The user data and tokens.
 */
const loginUser = async (identifier, password) => {
    // identifier can be email or username
    const user = await User.scope('withPassword').findOne({
        where: {
            [Op.or]: [
                { email: identifier },
                { userName: identifier }
            ]
        },
        include: [{ model: Role, as: 'role', attributes: ['roleId'] }],
    });

    if (!user || user.status !== 1) {
        throw new Error("Invalid credentials or account not activated.");
    }

    // Use the instance method defined on the User model
    const isPasswordCorrect = await user.validPassword(password);
    if (!isPasswordCorrect) {
        throw new Error("Invalid credentials or account not activated.");
    }

    const userPayload = { id: user.id, role: user.role.roleId };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);
    
    // The default scope of the User model already excludes the password.
    const userWithoutPassword = await User.findByPk(user.id);
    return { user: userWithoutPassword.toJSON(), accessToken, refreshToken };
};

/**
 * Registers a new, inactive user and sends an activation email.
 * @param {object} data The user data for registration.
 * @returns {Promise<import('../../models/user')>} The created or updated user object.
 */
const registerUser = async (data) => {
    const { email, userName, password, roleId = 3 } = data; // Default to USER role (3)
    if (!email || !userName || !password) {
        throw new Error("Missing required parameters!");
    }

    return sequelize.transaction(async (t) => {
        // In development, auto-activate users; in production, require email verification
        const isDevelopment = process.env.NODE_ENV === 'development';
        const activationToken = uuidv4();
        
        const [user, created] = await User.findOrCreate({
            where: { email },
            defaults: {
                email,
                userName,
                password, // The model's beforeSave hook will hash this automatically
                roleId,
                tokenRegister: activationToken,
                status: isDevelopment ? 1 : 0, // Auto-activate in development
            },
            transaction: t,
        });

        // If the user already existed but was inactive (status 0)
        if (!created) {
            if (user.status === 1) {
                throw new Error("This email is already in use by an active account.");
            }
            // Update the existing inactive user with the new password and a new token
            user.password = password; // The hook will hash this on save
            user.tokenRegister = activationToken;
            user.status = isDevelopment ? 1 : 0; // Auto-activate in development
            await user.save({ transaction: t });
        }

        // Send email asynchronously (even in development for testing)
        if (activationToken) {
            emailService.sendLinkAuthenEmail({ email: user.email, userName: user.userName, token: activationToken })
                .catch(err => console.error('Failed to send activation email:', err.message));
        }
        return user;
    });
};

/**
 * Activates a user's account using a registration token.
 * @param {string} token The activation token.
 */
const activateUserAccount = async (token) => {
    if (!token) throw new Error("Missing required token.");

    const [affectedRows] = await User.update(
        { status: 1, tokenRegister: null },
        { where: { tokenRegister: token } }
    );

    if (affectedRows === 0) {
        throw new Error("Invalid or expired activation token.");
    }
};

/**
 * Initiates the password reset process by sending an OTP via email.
 * @param {string} email The user's email address.
 */
const sendPasswordResetOtp = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.warn(`Password reset attempt for non-existent email: ${email}`);
    return; // Silently fail for security
  }

  const otpCode = await _generateAndSaveOtp(user.id, 5);
  await emailService.sendOtpResetPassword({ email, otpCode, userName: user.userName });
};

/**
 * Resets a user's password after they provide a valid OTP.
 * @param {string} email The user's email address.
 * @param {string} otpCode The OTP code provided by the user.
 * @param {string} newPassword The new password.
 */
const resetUserPassword = async (email, otpCode, newPassword) => {
  const user = await User.scope('withAuthDetails').findOne({ where: { email } });
  if (!user || !user.otpCode || !user.timeOtp) throw new Error("Invalid request or user not found.");
  if (user.otpCode !== otpCode) throw new Error("OTP code is incorrect.");
  if (new Date() > user.timeOtp) throw new Error("OTP has expired.");

  // Set the new password. The model's beforeSave hook will hash it.
  user.password = newPassword;
  // Invalidate the OTP
  user.otpCode = null;
  user.timeOtp = null;
  await user.save();
};

/**
 * Issues a new access token if the provided refresh token is valid.
 * @param {string} token The refresh token.
 * @returns {Promise<{newAccessToken: string}>} The new access token.
 */
const refreshAccessToken = async (token) => {
    const decoded = verifyRefreshToken(token);
    const user = await User.findOne({
        where: { id: decoded.id, status: 1 },
        include: [{ model: Role, as: 'role', attributes: ['roleId'] }],
    });

    if (!user) throw new Error("Authentication failed.");

    const newAccessToken = generateAccessToken({ id: user.id, role: user.role.roleId });
    return { newAccessToken };
};

/**
 * Sends a verification OTP to a user's registered phone number.
 * @param {number} userId The ID of the user.
 */
const sendVerificationSms = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user || !user.phoneNumber) {
    throw new Error("User or user's phone number not found.");
  }

  const otpCode = await _generateAndSaveOtp(user.id, 3);
  
  // const { sendSms } = require('../../utils/sms.js');
  // await sendSms(user.phoneNumber, `Your Bamito verification code is: ${otpCode}`);
  console.log(`(Pretending to send SMS) OTP for user ${userId} is: ${otpCode}`);
  return { message: 'OTP sent successfully.' };
};

const changePasswordInProfile = async (id, currentPassword, newPassword) => {
    // To check password, we must explicitly get the user WITH their password hash
    const user = await User.scope('withPassword').findByPk(id);
    if (!user) {
        throw new Error("User not found.");
    }

    // USE THE MODEL'S INSTANCE METHOD
    const isPasswordCorrect = await user.validPassword(currentPassword);
    if (!isPasswordCorrect) {
        throw new Error("Current password incorrect.");
    }

    if (currentPassword === newPassword) {
        throw new Error("New password cannot be the same as the current password.");
    }

    // Set the new password. The model's 'beforeSave' hook will hash it automatically.
    user.password = newPassword;
    await user.save(); // This triggers the hook
};

/**
 * Helper function to generate and save OTP for a user
 * @param {number} userId The user ID
 * @param {number} expiryMinutes OTP expiry time in minutes
 * @returns {Promise<string>} The generated OTP code
 */
const _generateAndSaveOtp = async (userId, expiryMinutes = 5) => {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const timeOtp = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    await User.update(
        { otpCode, timeOtp },
        { where: { id: userId } }
    );
    
    return otpCode;
};

const verifyOtp = async (userId, otpCode) => {
    // We need otpCode and timeOtp, so we can't use the default scope
    const user = await User.scope('withAuthDetails').findByPk(userId);
    if (!user || !user.otpCode || !user.timeOtp) {
        throw new Error("No pending OTP found for this user.");
    }
    if (user.otpCode !== otpCode) {
        throw new Error("OTP code is incorrect.");
    }
    if (new Date() > user.timeOtp) {
        throw new Error("OTP has expired.");
    }

    // Invalidate the OTP after successful verification
    await user.update({ otpCode: null, timeOtp: null });
    
    return true;
};

module.exports = {
  loginUser,
  registerUser,
  activateUserAccount,
  sendPasswordResetOtp,
  resetUserPassword,
  refreshAccessToken,
  sendVerificationSms,
  changePasswordInProfile,
  verifyOtp,
};
