# Social Media Image Guide for Trace

## Open Graph Image Specifications

### Recommended Dimensions

- **Facebook/LinkedIn**: 1200 x 630 pixels
- **Twitter**: 1200 x 675 pixels (or 1200 x 630 works too)
- **Optimal Size**: 1200 x 630 pixels (works for all platforms)

### Current Setup

Your site is configured to use: `https://tracework.space/logo.png`

### Creating an Optimized OG Image

#### Option 1: Use Canva (Recommended)

1. Go to [Canva.com](https://www.canva.com)
2. Create custom size: 1200 x 630 pixels
3. Use template or create from scratch
4. Include:
   - **Trace** logo/branding
   - Tagline: "Google Classroom CRM & Assignment Tracker"
   - Visual elements: Kanban board, calendar, trophy icons
   - Brand colors: Dark theme with purple/blue accents
5. Export as PNG
6. Save as `og-image.png` in `/client/public/`

#### Option 2: Use Figma

1. Create frame: 1200 x 630 pixels
2. Design with brand elements
3. Export as PNG (2x for retina displays)
4. Optimize with TinyPNG or similar

#### Option 3: Use Online Tools

- [OG Image Generator](https://og-image.vercel.app/)
- [Social Image Generator](https://www.bannerbear.com/)
- [Placid.app](https://placid.app/)

### Design Best Practices

#### Visual Elements

- ✅ Large, readable text (minimum 60px for main heading)
- ✅ High contrast for readability
- ✅ Brand colors and logo
- ✅ Relevant icons or illustrations
- ✅ Avoid text near edges (safe zone: 100px margin)

#### Content

- ✅ App name: "Trace"
- ✅ Value proposition: "Manage Google Classroom Like a Pro"
- ✅ Key features: "Kanban • Timeline • Leaderboard"
- ✅ Call to action (optional): "Free for Students"

#### Technical

- ✅ Format: PNG or JPG
- ✅ File size: Under 1MB (ideally under 300KB)
- ✅ Dimensions: Exactly 1200 x 630 pixels
- ✅ Color mode: RGB

### After Creating the Image

1. **Save the file**:

   ```
   /client/public/og-image.png
   ```

2. **Update index.html** (lines 32, 45):

   ```html
   <!-- Change from -->
   <meta property="og:image" content="https://tracework.space/logo.png" />
   <meta name="twitter:image" content="https://tracework.space/logo.png" />

   <!-- To -->
   <meta property="og:image" content="https://tracework.space/og-image.png" />
   <meta name="twitter:image" content="https://tracework.space/og-image.png" />
   ```

3. **Test the image**:
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Testing Social Cards

#### Facebook

1. Go to: https://developers.facebook.com/tools/debug/
2. Enter: https://tracework.space
3. Click "Scrape Again" to refresh cache
4. Verify image displays correctly

#### Twitter

1. Go to: https://cards-dev.twitter.com/validator
2. Enter: https://tracework.space
3. Preview the card
4. Check image, title, description

#### LinkedIn

1. Go to: https://www.linkedin.com/post-inspector/
2. Enter: https://tracework.space
3. Inspect the preview
4. Clear cache if needed

### Current Favicon Setup ✅

Your favicon is properly configured with multiple sizes:

- ✅ favicon.ico (16x16, 32x32, 48x48)
- ✅ favicon-16x16.png
- ✅ favicon-32x32.png
- ✅ android-chrome-192x192.png
- ✅ android-chrome-512x512.png
- ✅ apple-touch-icon.png

### Favicon Display Issues?

If favicon doesn't show in search results:

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Hard refresh**: Ctrl+F5
3. **Wait for Google to recrawl**: Can take 1-2 weeks
4. **Force recrawl**: Submit URL in Google Search Console
5. **Check file accessibility**: Visit https://tracework.space/favicon.ico directly

### Google Search Favicon Requirements

Google displays favicons in search results if:

- ✅ Favicon is accessible at root level
- ✅ File is in ICO, PNG, GIF, JPG, or SVG format
- ✅ Minimum size: 48x48 pixels (yours is ✅)
- ✅ Aspect ratio: 1:1 (square) (yours is ✅)
- ✅ File size: Under 100KB (yours is ✅)
- ⏳ Site is indexed by Google
- ⏳ Google has crawled the favicon (can take time)

### Force Google to Update Favicon

1. **Google Search Console**:

   - Go to: https://search.google.com/search-console
   - Add property: tracework.space
   - Request indexing for homepage

2. **Verify in Search**:

   - Search: `site:tracework.space`
   - Check if favicon appears (may take 1-2 weeks)

3. **Speed up process**:
   - Submit sitemap.xml
   - Request indexing for key pages
   - Ensure robots.txt allows crawling

---

**Note**: Favicon display in search results is controlled by Google and can take time. All technical requirements are met ✅
