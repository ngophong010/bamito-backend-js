/**
 * @fileoverview This utility handles all SMS sending functionality using the Twilio API.
 * It encapsulates the Twilio SDK initialization and provides a simple, reusable
 * function for sending text messages.
 */

// Use CommonJS 'require' to import the library
const twilio = require('twilio');

// Best Practice: The existence of these environment variables should be checked
// once at application startup in your central `/config/env.js` file.
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize the Twilio client once and reuse it across the application.
// This is more efficient than creating a new client for every message.
const twilioClient = twilio(accountSid, authToken);

/**
 * Sends an SMS message to a given phone number using Twilio.
 * @param {string} phoneNumber The recipient's phone number in local Vietnamese format (e.g., '0912345678').
 * @param {string} message The text body of the message to send.
 * @returns {Promise<string>} A promise that resolves to the SID of the message from Twilio upon successful sending.
 * @throws {Error} If the phone number or message is missing, or if the SMS fails to send.
 */
const sendSms = async (phoneNumber, message) => {
  if (!phoneNumber || !message) {
    throw new Error("Phone number and message are required for sending SMS.");
  }

  // Twilio requires phone numbers in E.164 format.
  // This logic converts a local Vietnamese number (e.g., 0912345678)
  // to the required format (e.g., +84912345678).
  // Adjust the country code '+84' as needed for your target audience.
  const formattedPhone = phoneNumber.startsWith('0')
    ? `+84${phoneNumber.substring(1)}`
    : `+84${phoneNumber}`;

  try {
    // Create the message using the Twilio SDK
    const response = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber, // Your Twilio phone number
      to: formattedPhone,      // The recipient's number
    });

    if (response.sid) {
      console.log(`SMS sent successfully to ${formattedPhone}. SID: ${response.sid}`);
      return response.sid;
    } else {
      // This is a defensive check for rare cases where the Twilio API might
      // not return an SID but also doesn't throw an error.
      throw new Error("Twilio API did not return a message SID.");
    }
  } catch (error) {
    // Log the detailed error from Twilio for debugging purposes.
    console.error("Twilio SMS Error:", error.message);
    
    // Re-throw a generic, user-friendly error to avoid leaking implementation details
    // to the rest of the application or the end-user.
    throw new Error(`Failed to send SMS. Please ensure the phone number is valid and try again later.`);
  }
};

module.exports = {
  sendSms,
};
