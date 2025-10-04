const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");

const userService = require("../services/userService.js");
const jwtService = require("../utils/jwt.js");

const { 
  registerUser,
  loginUser,
  activateUserAccount,
  sendPasswordResetOtp,
  resetUserPassword,
  refreshAccessToken, 
} = require("../services/authService.js");

const cookieOptions = {
    httpOnly: true, // Ngăn JavaScript phía client truy cập cookie
    secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS trong môi trường production
    path: "/",
    sameSite: "lax", // Hoặc "strict" để chống CSRF tốt hơn
};

// --- AUTHENTICATION & REGISTRATION ---
/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
const handleRegister = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    await registerUser(req.body);
    res.status(201).json({ message: "Đăng ký thành công. Vui lòng kiểm tra email để kích hoạt tài khoản." });
});

/**
 * @desc    Log in a user and set access/refresh tokens in cookies
 * @route   POST /api/auth/login
 */
const handleLogin = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser(email, password);
    
    // Thiết lập tokens trong secure cookies
    res.cookie("access_token", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 phút
    res.cookie("refresh_token", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 ngày

    res.status(200).json(user); // Gửi lại dữ liệu người dùng (không có mật khẩu)
});

/**
 * @desc    Activate a user's account via a token
 * @route   GET /api/auth/activate
 */
const handleActivateAccount = asyncHandler(async (req, res) => {
    // req.query.token đã là một chuỗi, không cần "as string"
    const { token } = req.query;
    await activateUserAccount(token);
    // Chuyển hướng đến trang "thành công" trên front-end
    res.redirect(`${process.env.URL_CLIENT}/activation-success`);
});

/**
 * @desc    Log out a user by clearing their cookies
 * @route   POST /api/auth/logout
 */
const handleLogout = asyncHandler(async (req, res) => {
    // Xóa cookies bằng cách đặt giá trị rỗng và ngày hết hạn trong quá khứ.
    res.cookie("access_token", "", { ...cookieOptions, expires: new Date(0) });
    res.cookie("refresh_token", "", { ...cookieOptions, expires: new Date(0) });
    res.status(200).json({ message: "Đăng xuất thành công." });
});

/**
 * @desc    Generate a new access token using the refresh token
 * @route   POST /api/auth/refresh-token
 */
const handleRefreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refresh_token;

    // Service sẽ ném lỗi nếu token không hợp lệ, lỗi này sẽ được bắt
    // bởi global error handler và trả về lỗi 401/403.
    const { newAccessToken } = await refreshAccessToken(refreshToken);

    res.cookie("access_token", newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 phút
    res.status(200).json({ message: "Làm mới access token thành công." });
});

/**
 * @desc    Send a password reset OTP to a user's email
 * @route   POST /api/auth/forgot-password
 */
const handleForgotPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { email } = req.body;
    await sendPasswordResetOtp(email);
    res.status(200).json({ message: "Gửi OTP thành công. Vui lòng kiểm tra email." });
});

/**
 * @desc    Reset a user's password using a valid OTP
 * @route   POST /api/auth/reset-password
 */
const handleResetPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { email, otpCode, newPassword } = req.body;
    await resetUserPassword(email, otpCode, newPassword);
    res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
});

module.exports = {
    handleRegister,
    handleLogin,
    handleActivateAccount,
    handleLogout,
    handleRefreshToken,
    handleForgotPassword,
    handleResetPassword,
};
