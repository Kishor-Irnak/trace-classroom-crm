# Custom Domain Setup for GitHub Pages

This project is configured to work with both GitHub Pages subpath (`/trace-classroom-crm/`) and custom domains.

## Setup for Custom Domain

### 1. Configure Your Custom Domain in GitHub

1. Go to your repository settings
2. Navigate to **Pages** section
3. Under **Custom domain**, enter your domain (e.g., `example.com` or `www.example.com`)
4. GitHub will automatically create a CNAME file

### 2. Update the CNAME File

Edit `client/public/CNAME` and replace the comment with your actual domain:

```
example.com
```

Or for www subdomain:

```
www.example.com
```

### 3. Build with Custom Domain Flag

When building for custom domain, set the environment variable:

```bash
VITE_USE_CUSTOM_DOMAIN=true npm run client:build
```

Or add it to your deployment script:

```bash
# For custom domain
VITE_USE_CUSTOM_DOMAIN=true npm run predeploy && npm run deploy

# For GitHub Pages subpath (default)
npm run predeploy && npm run deploy
```

### 4. DNS Configuration

Configure your DNS records:

**For apex domain (example.com):**

- Type: `A`
- Records:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`

**For www subdomain (www.example.com):**

- Type: `CNAME`
- Value: `yourusername.github.io`

### 5. SSL Certificate

GitHub Pages automatically provisions SSL certificates for custom domains. It may take a few minutes to a few hours after DNS is configured.

## Environment Variables

- `VITE_USE_CUSTOM_DOMAIN=true` - Use root path `/` instead of `/trace-classroom-crm/`
- `VITE_BASE_URL=/custom-path/` - Override base path completely

## Verification

After setup:

1. Wait for DNS propagation (can take up to 48 hours)
2. Check SSL certificate status in GitHub Pages settings
3. Visit your custom domain
4. Verify all routes work (refresh on any page should not show 404)

## Troubleshooting

- **404 errors on refresh**: Make sure `404.html` is in the dist folder (handled automatically)
- **Assets not loading**: Check that base path is correct in `vite.config.ts`
- **Service worker issues**: Clear browser cache and unregister old service workers
