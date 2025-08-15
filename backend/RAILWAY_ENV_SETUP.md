# 🚀 Railway Environment Variables Setup Guide

## 🚨 CRITICAL: Backend đang fail vì thiếu environment variables!

### **📋 Bước 1: Xóa variables hiện tại**
Trong Railway Dashboard → Backend Project → Variables:
- Xóa `HELLO=world`
- Xóa `FOO=bar`

### **📋 Bước 2: Copy các variables sau vào Railway:**

```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://tannhat180803:L64aegbWc5eNDEzE@cluster0.ifd77yn.mongodb.net/uniplan?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=d05f131023e84a4bb9045fffff912dd44ca421b7de42b288cf532b25f3a193d9
JWT_EXPIRES_IN=1d
EMAIL_USER=tannhat180803@gmail.com
EMAIL_PASS=furchqceayexnznz
SUPABASE_URL=https://bwdffmrjcxqwthjplopc.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3ZGZmbXJqY3hxd3RoanBsb3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI4MjYyOCwiZXhwIjoyMDY0ODU4NjI4fQ.KF-ZkNiu9raQqgfl6qZwuiOD5uBEhmOJ8tNe5FmTXAg
SUPABASE_BUCKET_NAME=uniplan-upload-file
MOMO_PARTNER_CODE=MOMOBKUN20180529
MOMO_ACCESS_KEY=klm05TvNBzhg7h7j
MOMO_SECRET_KEY=at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa
MOMO_REDIRECT_URL=https://web-production-61868.up.railway.app/api/payment/momo/return
MOMO_IPN_URL=https://web-production-61868.up.railway.app/api/payment/momo/ipn
MOMO_API_HOSTNAME=test-payment.momo.vn
```

### **📋 Bước 3: Cách thêm variables:**
1. **Railway Dashboard** → Your Backend Project
2. **Variables tab** → **Raw Editor**
3. **Xóa hết** content hiện tại
4. **Paste** toàn bộ content trên
5. **Update Variables**

### **📋 Bước 4: Trigger redeploy:**
1. **Deployments tab**
2. **Redeploy** latest deployment
3. **Hoặc** push một commit nhỏ để trigger auto-deploy

### **🔍 Kiểm tra deployment:**
1. **Logs** sẽ hiển thị database connection success
2. **No more** "MONGO_URI environment variable is not defined" errors
3. **CORS** sẽ hoạt động đúng với production URLs

### **⚠️ LƯU Ý:**
- **MONGO_URI**: Đã whitelist IP 0.0.0.0/0 cho Railway
- **MoMo URLs**: Đã update cho Railway backend URL
- **JWT_SECRET**: Production-ready secret key
- **Supabase**: Configured cho file uploads
