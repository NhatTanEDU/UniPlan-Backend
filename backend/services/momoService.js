// backend/services/momoService.js
const crypto = require('crypto');
const https = require('https');
const momoConfig = require('../config/momo.config');
const Payment = require('../models/payment.model');

class MoMoService {
    
    /**
     * Tạo chữ ký cho request MoMo
     */
    generateSignature(rawData) {
        try {
            return crypto
                .createHmac('sha256', momoConfig.secretKey)
                .update(rawData)
                .digest('hex');
        } catch (error) {
            console.error('Error generating signature:', error);
            throw new Error('Failed to generate payment signature');
        }
    }
    
    /**
     * Xác thực chữ ký từ MoMo
     */
    verifySignature(rawData, signature) {
        try {
            const expectedSignature = this.generateSignature(rawData);
            return expectedSignature === signature;
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }
    
    /**
     * Tạo request ID unique
     */
    generateRequestId() {
        return `UNIPLAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
      /**
     * Tạo thanh toán MoMo - THEO CHÍNH XÁC mẫu GitHub
     */
    async createPayment(userId, planType, userInfo = {}) {
        try {
            console.log(`🔄 Creating MoMo payment for user ${userId}, plan: ${planType}`);
            
            // Lấy thông tin gói
            const planInfo = momoConfig.getPaymentInfo(planType);
            if (!planInfo) {
                throw new Error(`Invalid plan type: ${planType}`);
            }
              // Tạo order ID và request ID giống mẫu GitHub
            const partnerCode = momoConfig.partnerCode;
            const accessKey = momoConfig.accessKey;
            const secretkey = momoConfig.secretKey;
            const requestId = partnerCode + new Date().getTime();
            const orderId = requestId;
            const orderInfo = planInfo.description;
            const redirectUrl = momoConfig.redirectUrl;
            const ipnUrl = momoConfig.ipnUrl;
            const amount = planInfo.amount.toString();
            const requestType = "captureWallet";
            const extraData = "";
            
            console.log(`🆔 Generated IDs - OrderID: ${orderId}, RequestID: ${requestId}`);
            
            // Tạo raw signature string CHÍNH XÁC theo mẫu GitHub
            const rawSignature = "accessKey="+accessKey+"&amount=" + amount+"&extraData=" + extraData+"&ipnUrl=" + ipnUrl+"&orderId=" + orderId+"&orderInfo=" + orderInfo+"&partnerCode=" + partnerCode +"&redirectUrl=" + redirectUrl+"&requestId=" + requestId+"&requestType=" + requestType;
            
            console.log("--------------------RAW SIGNATURE----------------");
            console.log(rawSignature);
            
            // Tạo signature
            const signature = crypto.createHmac('sha256', secretkey)
                .update(rawSignature)
                .digest('hex');
                
            console.log("--------------------SIGNATURE----------------");
            console.log(signature);
            
            // JSON object send to MoMo endpoint - CHÍNH XÁC theo mẫu GitHub
            const requestData = {
                partnerCode : partnerCode,
                accessKey : accessKey,
                requestId : requestId,
                amount : amount,
                orderId : orderId,
                orderInfo : orderInfo,
                redirectUrl : redirectUrl,
                ipnUrl : ipnUrl,
                extraData : extraData,
                requestType : requestType,
                signature : signature,
                lang: 'vi'
            };
            
            console.log('📝 Full MoMo request body:', JSON.stringify(requestData, null, 2));            
            // Gọi MoMo API
            const momoResponse = await this.callMoMoAPI(requestData);
            
            console.log('✅ MoMo API Success - Full response:', momoResponse);
            
            // Lưu vào database
            const payment = new Payment({
                user_id: userId,
                plan_type: planType,
                plan_name: planInfo.name,
                amount: planInfo.amount,
                momo_order_id: orderId,
                momo_request_id: requestId,
                momo_pay_url: momoResponse.payUrl,
                momo_deeplink: momoResponse.deeplink,
                momo_qr_code_url: momoResponse.qrCodeUrl,
                payment_status: 'pending',
                expired_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
                metadata: {
                    ip_address: userInfo.ip,
                    user_agent: userInfo.userAgent,
                    device_info: userInfo.device
                }
            });
            
            await payment.save();
            
            console.log('✅ Payment created successfully:', orderId);            
            return {
                success: true,
                orderId: orderId,
                requestId: requestId,
                amount: planInfo.amount,
                planName: planInfo.name,
                payUrl: momoResponse.payUrl,
                deeplink: momoResponse.deeplink,
                qrCodeUrl: momoResponse.qrCodeUrl,
                expiresAt: payment.expired_at,
                message: 'Payment created successfully'
            };
              } catch (error) {
            console.error('❌ Error creating MoMo payment:', error);
            throw new Error(`Failed to create payment: ${error.message}`);
        }
    }
    
    /**
     * Gọi MoMo API
     */
    async callMoMoAPI(requestData) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(requestData);
            
            const options = {
                hostname: momoConfig.apiHostname,
                port: 443,
                path: momoConfig.apiPath,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: momoConfig.timeout
            };
            
            console.log('📡 Calling MoMo API:', momoConfig.getApiUrl());
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        console.log('📨 MoMo API Response:', {
                            resultCode: response.resultCode,
                            message: response.message,
                            orderId: response.orderId
                        });
                        
                        if (response.resultCode === 0) {
                            resolve(response);
                        } else {
                            reject(new Error(`MoMo API Error: ${response.message} (Code: ${response.resultCode})`));
                        }
                    } catch (error) {
                        reject(new Error(`Invalid JSON response from MoMo: ${error.message}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error('❌ MoMo API Request Error:', error);
                reject(new Error(`Network error: ${error.message}`));
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('MoMo API request timeout'));
            });
            
            req.write(postData);
            req.end();
        });
    }
      /**
     * Xử lý IPN callback từ MoMo
     */
    async handleIPN(ipnData) {
        try {            console.log('📨 Received MoMo IPN:', ipnData.orderId);
            
            // Verify signature theo format của MoMo IPN  
            // Format theo MoMo documentation: https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
            // Thứ tự field: accessKey + amount + extraData + message + orderId + orderInfo + orderType + partnerCode + payType + requestId + responseTime + resultCode + transId
            const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${ipnData.amount}&extraData=${ipnData.extraData || ''}&message=${ipnData.message}&orderId=${ipnData.orderId}&orderInfo=${ipnData.orderInfo}&orderType=${ipnData.orderType}&partnerCode=${ipnData.partnerCode}&payType=${ipnData.payType}&requestId=${ipnData.requestId}&responseTime=${ipnData.responseTime}&resultCode=${ipnData.resultCode}&transId=${ipnData.transId}`;
            
            const expectedSignature = this.generateSignature(rawSignature);
            const isValidSignature = expectedSignature === ipnData.signature;
            
            console.log('🔍 [MoMo IPN] Signature verification:');
            console.log('🔍 rawSignature:', rawSignature);
            console.log('🔍 expectedSignature:', expectedSignature);
            console.log('🔍 receivedSignature:', ipnData.signature);
            console.log('🔍 isValid:', isValidSignature);
            
            // Skip signature validation in development for testing
            const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
            
            if (!isValidSignature && !isDevelopment) {
                console.error('❌ Invalid signature from MoMo IPN');
                throw new Error('Invalid signature');
            } else if (!isValidSignature && isDevelopment) {
                console.warn('⚠️ [DEV MODE] Invalid signature - continuing for testing...');
            } else {
                console.log('✅ Signature verification passed');
            }
            
            // Tìm payment trong database
            const payment = await Payment.findOne({ momo_order_id: ipnData.orderId });
            
            if (!payment) {
                console.error('❌ Payment not found:', ipnData.orderId);
                throw new Error('Payment not found');
            }
            
            // Cập nhật trạng thái payment
            if (ipnData.resultCode === 0) {
                // Thanh toán thành công
                payment.markAsCompleted(ipnData);
                await payment.save();
                
                // Nâng cấp gói user
                const User = require('../models/user.model');
                const user = await User.findById(payment.user_id);
                
                if (user) {
                    user.upgradeToSubscription(payment.plan_type);
                    await user.save();
                    
                    console.log('✅ User upgraded successfully:', user.email);
                }
                
                console.log('✅ Payment completed successfully:', ipnData.orderId);
                
            } else {
                // Thanh toán thất bại
                payment.markAsFailed(ipnData);
                await payment.save();
                
                console.log('❌ Payment failed:', ipnData.orderId, ipnData.message);
            }
            
            return {
                success: true,
                orderId: ipnData.orderId,
                status: ipnData.resultCode === 0 ? 'completed' : 'failed'
            };
            
        } catch (error) {
            console.error('❌ Error handling MoMo IPN:', error);
            throw error;
        }
    }
    
    /**
     * Kiểm tra trạng thái thanh toán
     */
    async checkPaymentStatus(orderId) {
        try {
            const payment = await Payment.findOne({ momo_order_id: orderId })
                .populate('user_id', 'email');
            
            if (!payment) {
                return {
                    success: false,
                    message: 'Payment not found'
                };
            }
            
            // Kiểm tra xem đã hết hạn chưa
            if (payment.isExpired() && payment.payment_status === 'pending') {
                payment.payment_status = 'expired';
                await payment.save();
            }
            
            return {
                success: true,
                payment: {
                    orderId: payment.momo_order_id,
                    status: payment.payment_status,
                    amount: payment.amount,
                    planName: payment.plan_name,
                    createdAt: payment.created_at,
                    completedAt: payment.completed_at,
                    userEmail: payment.user_id ? payment.user_id.email : null,
                    isExpired: payment.isExpired()
                }
            };
            
        } catch (error) {
            console.error('❌ Error checking payment status:', error);
            return {
                success: false,
                message: `Error checking payment status: ${error.message}`
            };
        }
    }
}

module.exports = new MoMoService();