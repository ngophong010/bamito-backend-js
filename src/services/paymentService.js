/**
 * @fileoverview This service handles the business logic for creating and verifying
 * VNPAY payment transactions. It interfaces with the Order service to finalize
 * the checkout process after a successful payment.
 */

const moment = require("moment");
const qs = require("qs"); // Use 'qs' as querystring is deprecated in newer Node versions
const crypto = require("crypto");
const { createOrder } = require("../services/orderService.js"); // Import the order service

/**
 * A private helper function to sort an object's keys alphabetically,
 * as required by VNPAY for signature generation.
 * @private
 * @param {object} obj The object to sort.
 * @returns {object} A new object with sorted keys.
 */
const sortObject = (obj) => {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
};

/**
 * Creates a VNPAY payment URL from order data.
 * The order data is encoded into the URL to be retrieved in the callback.
 * @param {object} orderData The data for the order to be created after payment.
 * @param {string} ipAddr The IP address of the user.
 * @returns {string} The generated VNPAY payment URL.
 */
const createVnPayUrl = (orderData, ipAddr) => {
    // Encode the full order data to be retrieved later from the callback URL
    const orderInfoString = Buffer.from(JSON.stringify(orderData)).toString('base64');
    
    process.env.TZ = "Asia/Ho_Chi_Minh";
    const createDate = moment(new Date()).format("YYYYMMDDHHmmss");
    const tmnCode = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    let vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURNURL;
    const amount = orderData.totalPrice;
    const vnp_TxnRef = createDate;

    let vnp_Params = {
        'vnp_Version': "2.1.0",
        'vnp_Command': "pay",
        'vnp_TmnCode': tmnCode,
        'vnp_Locale': 'vn',
        'vnp_CurrCode': 'VND',
        'vnp_TxnRef': vnp_TxnRef,
        'vnp_OrderInfo': orderInfoString,
        'vnp_OrderType': 'other',
        'vnp_Amount': amount * 100, // Amount must be in cents
        'vnp_ReturnUrl': returnUrl,
        'vnp_IpAddr': ipAddr,
        'vnp_CreateDate': createDate,
    };

    vnp_Params = sortObject(vnp_Params);
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += "?" + qs.stringify(vnp_Params, { encode: false });

    return vnpUrl;
};

/**
 * Verifies the VNPAY return URL and creates the order if the payment was successful.
 * @param {object} vnp_Params The query parameters from the VNPAY callback.
 * @returns {Promise<import('../../models/order')>} The newly created order object if successful.
 * @throws {Error} If the signature is invalid, price mismatches, or order creation fails.
 */
const handleVnPayReturnService = async (vnp_Params) => {
    const secureHash = vnp_Params["vnp_SecureHash"];
    
    // Remove hash properties from the params object before sorting and signing
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const sortedParams = sortObject(vnp_Params);
    const secretKey = process.env.VNP_HASHSECRET;
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash !== signed) {
        throw new Error("Invalid VNPAY signature.");
    }
    
    // If the signature is valid, decode the order data
    const orderInfoString = Buffer.from(vnp_Params['vnp_OrderInfo'], 'base64').toString('utf8');
    const orderData = JSON.parse(orderInfoString);

    // Security Check: Verify that the amount paid matches the amount in our original data
    if (orderData.totalPrice !== (Number(vnp_Params['vnp_Amount']) / 100)) {
        throw new Error("Price mismatch error during payment verification.");
    }
    
    // The payment is valid. Now, call the order service to create the order.
    // The createOrder function is already transactional and handles inventory, cart clearing, etc.
    const newOrder = await createOrder(orderData);
    return newOrder;
};

module.exports = {
    createVnPayUrl,
    handleVnPayReturnService, // Renamed to avoid confusion with controller handlers
};