# 🚨 Railway "Cannot find module '/app/server.js'" Fix

## 🔍 **Vấn đề:**
Railway đang tìm `/app/server.js` nhưng không tìm thấy, có thể do:
1. **Build context** không đúng (build từ root thay vì backend directory)
2. **Start command** không đúng trong Railway dashboard
3. **Working directory** không đúng

## ✅ **Giải pháp đã implement:**

### **1. Tạo railway.json**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **2. Tạo nixpacks.toml**
```toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
cmds = ["npm ci"]

[start]
cmd = "node server.js"
```

### **3. Verified file structure:**
- ✅ `server.js` exists in backend root
- ✅ `package.json` has `"main": "server.js"`
- ✅ `package.json` has `"start": "node server.js"`
- ✅ `Procfile` has `web: node server.js`

## 🔧 **Railway Dashboard Settings:**

### **Build Settings:**
- **Root Directory:** `/` (hoặc để trống)
- **Build Command:** `npm ci` (auto-detected)
- **Start Command:** `node server.js`

### **Environment Variables:**
- Đã setup trong `RAILWAY_ENV_SETUP.md`
- Cần copy từ `.env.railway`

## 🚀 **Deploy Steps:**

1. **Push changes** (railway.json, nixpacks.toml)
2. **Railway Dashboard** → Settings → Deploy
3. **Verify Start Command:** `node server.js`
4. **Trigger Redeploy**
5. **Check logs** for successful startup

## 🔍 **Expected Success Logs:**
```
✅ Database connected successfully
✅ Server running on port 5000
✅ Socket.IO server initialized
```

## ⚠️ **If still failing:**
1. Check Railway **Root Directory** setting
2. Verify **Environment Variables** are set
3. Check **Build Logs** for npm install errors
4. Ensure **MongoDB connection** is working
