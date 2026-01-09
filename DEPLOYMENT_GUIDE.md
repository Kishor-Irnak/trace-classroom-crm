# GitHub Pages Auto-Deployment Guide

This guide will help you set up automatic deployment to GitHub Pages whenever you push code to the `main` branch.

## ✅ What's Already Done

- ✅ GitHub Actions workflow file created (`.github/workflows/deploy.yml`)
- ✅ Build script configured in `package.json`
- ✅ 404.html copy script for SPA routing
- ✅ Vite configuration for GitHub Pages

## 🔧 Required Setup Steps

### Step 1: Configure GitHub Repository Settings

1. Go to your GitHub repository: `https://github.com/Kishor-Irnak/trace-classroom-crm`

2. Navigate to **Settings** → **Pages**

3. Under **Build and deployment**:
   - **Source**: Select "GitHub Actions"
   - This enables the workflow to deploy automatically

### Step 2: Add Firebase Environment Variables as Secrets

You need to add your Firebase configuration as GitHub Secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**

2. Click **New repository secret** and add each of the following:

   | Secret Name                         | Description                             |
   | ----------------------------------- | --------------------------------------- |
   | `VITE_FIREBASE_API_KEY`             | Your Firebase API Key                   |
   | `VITE_FIREBASE_AUTH_DOMAIN`         | Your Firebase Auth Domain               |
   | `VITE_FIREBASE_PROJECT_ID`          | Your Firebase Project ID                |
   | `VITE_FIREBASE_STORAGE_BUCKET`      | Your Firebase Storage Bucket            |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Messaging Sender ID       |
   | `VITE_FIREBASE_APP_ID`              | Your Firebase App ID                    |
   | `VITE_FIREBASE_MEASUREMENT_ID`      | Your Firebase Measurement ID (optional) |

**Where to find these values:**

- Check your `.env` file locally
- Or go to Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

### Step 3: Configure Custom Domain (Optional)

If you're using a custom domain (`tracework.space`):

1. Create/update `client/public/CNAME` file with your domain:

   ```
   tracework.space
   ```

2. Configure DNS settings with your domain provider:

   - Add a CNAME record pointing to: `kishor-irnak.github.io`
   - Or add A records pointing to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`

3. In GitHub Settings → Pages → Custom domain, enter: `tracework.space`

### Step 4: Push Your Code

Once everything is configured:

```bash
git add .
git commit -m "Setup auto-deployment to GitHub Pages"
git push origin main
```

## 🚀 How It Works

1. **Trigger**: Workflow runs automatically when you push to `main` branch
2. **Build**:
   - Installs dependencies
   - Builds the Vite app with Firebase environment variables
   - Creates 404.html for SPA routing
3. **Deploy**: Uploads build artifacts and deploys to GitHub Pages
4. **Live**: Your site is live at your configured URL

## 📊 Monitoring Deployments

1. Go to **Actions** tab in your GitHub repository
2. You'll see each deployment run
3. Click on any run to see detailed logs
4. Green checkmark ✅ = successful deployment
5. Red X ❌ = failed deployment (check logs for errors)

## 🔍 Troubleshooting

### Build Fails

- Check that all Firebase secrets are correctly set
- Review the build logs in the Actions tab
- Ensure your code builds locally with `npm run build`

### 404 Errors

- The workflow automatically creates a 404.html file
- This ensures client-side routing works correctly

### Custom Domain Not Working

- Verify CNAME file exists in `client/public/CNAME`
- Check DNS settings with your domain provider
- Allow up to 24 hours for DNS propagation

### Deployment Takes Long

- First deployment may take 5-10 minutes
- Subsequent deployments are usually faster (2-5 minutes)

## 📝 Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
npm run deploy
```

This uses the `gh-pages` package to deploy to the `gh-pages` branch.

## 🔄 Workflow Features

- **Automatic**: Deploys on every push to `main`
- **Manual**: Can also trigger manually from Actions tab
- **Concurrent Protection**: Only one deployment runs at a time
- **Environment**: Uses GitHub Pages environment for better tracking
- **Secure**: Uses GitHub's OIDC token for authentication

## 📚 Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

---

**Need Help?** Check the Actions tab for deployment logs or review this guide.
