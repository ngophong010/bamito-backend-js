/**
 * @fileoverview This utility handles all email sending functionality for the application
 * using Elastic Email API. Elastic Email offers 100 emails/day free forever.
 */

const axios = require('axios');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// --- 1. Configure Elastic Email ---
const ELASTIC_EMAIL_API_KEY = process.env.ELASTIC_EMAIL_API_KEY;
const ELASTIC_EMAIL_API_URL = 'https://api.elasticemail.com/v2/email/send';

/**
 * @typedef {object} UserEmailData
 * @property {string} email - The user's email address.
 * @property {string} userName - The user's name.
 * @property {string} [token] - An optional token (e.g., for account activation).
 * @property {string} [otpCode] - An optional OTP code (e.g., for password reset).
 */

/**
 * @typedef {object} OrderEmailData
 * @property {string} email - The recipient's email address.
 * @property {object} orderDetails - The full details of the confirmed order.
 * @property {string} orderDetails.orderId - The unique ID of the order.
 * @property {number} orderDetails.totalPrice - The total price of the order.
 * @property {string} orderDetails.deliveryAddress - The delivery address.
 * @property {object} orderDetails.user - The user who placed the order.
 * @property {string} orderDetails.user.userName - The name of the user.
 */

// --- 2. Private Helper to RENDER a template and SEND ---
const _renderAndSend = async (templateName, data, emailOptions) => {
    try {
        const templatePath = path.join(__dirname, `../templates/html/${templateName}.html`);
        const template = fs.readFileSync(templatePath, 'utf-8');
        const html = ejs.render(template, data);

        const params = new URLSearchParams({
            apikey: ELASTIC_EMAIL_API_KEY,
            from: process.env.EMAIL_FROM_ADDRESS,
            fromName: process.env.EMAIL_FROM_NAME,
            to: emailOptions.to,
            subject: emailOptions.subject,
            bodyHtml: html,
            isTransactional: 'true'
        });

        const response = await axios.post(ELASTIC_EMAIL_API_URL, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.data.success) {
            console.log(`Email sent successfully to ${emailOptions.to}`);
        } else {
            throw new Error(response.data.error || 'Unknown error');
        }
    } catch (error) {
        console.error("Error sending email via Elastic Email:", error.message);
        if (error.response) {
            console.error(error.response.data);
        }
        throw new Error(`Failed to send ${templateName} email.`);
    }
};

// --- 3. Public, Use-Case-Specific Functions ---

const sendLinkAuthenEmail = async (data) => {
  const activationUrl = `${process.env.URL_CLIENT}/activate?token=${data.token}`;
  await _renderAndSend(
    'activationTemplate',
    { userName: data.userName, activationUrl },
    { to: data.email, subject: 'Activate Your Bamito Account' }
  );
};

const sendOtpResetPassword = async (data) => {
  await _renderAndSend(
    'otpTemplate',
    { userName: data.userName, otpCode: data.otpCode },
    { to: data.email, subject: 'Your Bamito Password Reset Code' }
  );
};

/**
 * Sends an order confirmation email.
 * @param {OrderEmailData} data - The recipient's email and the full order details.
 */
const sendOrderConfirmation = async (data) => {
  await _renderAndSend(
    'orderConfirmationTemplate',
    // Pass the entire orderDetails object to the template for maximum flexibility
    { orderDetails: data.orderDetails }, 
    { 
      to: data.email, 
      subject: `Your Bamito Order Confirmation #${data.orderDetails.orderId}` 
    }
  );
};

module.exports = {
    sendLinkAuthenEmail,
    sendOtpResetPassword,
    sendOrderConfirmation,
};
