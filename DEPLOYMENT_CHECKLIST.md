# 🚀 GitHub Pages Auto-Deployment Checklist

## Quick Setup (5 minutes)

### ☐ Step 1: Enable GitHub Pages

- [ ] Go to: https://github.com/Kishor-Irnak/trace-classroom-crm/settings/pages
- [ ] Under "Build and deployment" → Source: Select **"GitHub Actions"**

### ☐ Step 2: Add Firebase Secrets

- [ ] Go to: https://github.com/Kishor-Irnak/trace-classroom-crm/settings/secrets/actions
- [ ] Click "New repository secret" for each:
  - [ ] `VITE_FIREBASE_API_KEY`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN`
  - [ ] `VITE_FIREBASE_PROJECT_ID`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `VITE_FIREBASE_APP_ID`
  - [ ] `VITE_FIREBASE_MEASUREMENT_ID` (optional)

**💡 Tip:** Copy values from your local `.env` file

### ☐ Step 3: Push Code

```bash
git add .
git commit -m "Setup auto-deployment"
git push origin main
```

### ☐ Step 4: Verify Deployment

- [ ] Go to: https://github.com/Kishor-Irnak/trace-classroom-crm/actions
- [ ] Wait for green checkmark ✅
- [ ] Visit your site!

---

## 🌐 Custom Domain Setup (Optional)

Only if using `tracework.space`:

- [ ] Ensure `client/public/CNAME` contains: `tracework.space`
- [ ] Configure DNS with domain provider
- [ ] Add custom domain in GitHub Pages settings

---

## ✅ You're Done!

After completing these steps, every push to `main` will automatically deploy to GitHub Pages! 🎉

**View deployment status:** https://github.com/Kishor-Irnak/trace-classroom-crm/actions
