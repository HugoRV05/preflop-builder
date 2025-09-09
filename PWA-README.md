# Progressive Web App (PWA) Setup for Preflop Builder

Your Preflop Builder application has been successfully converted to a Progressive Web App (PWA)! 🎉

## 📱 What's New

### PWA Features Added:
- **App-like Experience**: Can be installed on mobile devices and behave like a native app
- **Offline Functionality**: Service worker caches essential files for offline use
- **Home Screen Installation**: Users can add the app to their home screen on iOS/Android
- **Standalone Mode**: Runs without browser UI when installed
- **Background Updates**: App updates automatically when new versions are available

## 🗂️ Files Added

### Core PWA Files:
- `manifest.json` - PWA configuration and app metadata
- `sw.js` - Service worker for offline functionality and caching
- `browserconfig.xml` - Microsoft Windows PWA support

### Updated Files:
- `index.html` - Added PWA meta tags and manifest link
- `js/main.js` - Added service worker registration and PWA utilities
- `css/styles.css` - Added PWA-specific styles for standalone mode

## 🎨 Configuration

### Colors Used:
- **Theme Color**: `#00d4ff` (Your accent blue)
- **Background Color**: `#1a1a1a` (Your dark background)

### App Names:
- **Full Name**: "Preflop Builder"
- **Short Name**: "Preflop Builder"

## 🖼️ Missing Icons (Required)

You need to add these icon files to the `assets/` directory:

```
assets/
├── icon-192.png    (192×192 pixels)
└── icon-512.png    (512×512 pixels)
```

### Icon Requirements:
- **192×192**: Used for app icons and shortcuts
- **512×512**: Used for splash screens and larger displays
- **Format**: PNG with transparent background recommended
- **Content**: Should represent your Preflop Builder brand/logo

### Creating Icons:
1. Design a square logo/icon representing poker/preflop concepts
2. Export as PNG with the exact dimensions above
3. Place in the `assets/` folder
4. Test the PWA installation

## 🔧 Configuration Updates

### Easy Maintenance:
All paths and configurations are centralized:

- **JSON Path**: Update `DEFAULT_RANGES_PATH` in `js/main.js`
- **Icon Paths**: Update `manifest.json` if you move/rename icons
- **Colors**: Update `manifest.json` and CSS variables
- **App Names**: Update `manifest.json`

## 📱 Testing PWA Functionality

### Local Testing:
1. Run local server: `python -m http.server 8000`
2. Open in Chrome: `http://localhost:8000`
3. Open DevTools → Application → Manifest
4. Check "Service Workers" and "Storage"

### Mobile Testing:
1. Deploy to HTTPS server (required for PWA)
2. Open in mobile Chrome/Safari
3. Look for "Add to Home Screen" prompt
4. Install and test standalone mode

### PWA Audit:
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run PWA audit
4. Fix any issues reported

## 🚀 Deployment Notes

### HTTPS Required:
- PWAs require HTTPS in production
- Service workers only work over HTTPS
- Use services like Netlify, Vercel, or GitHub Pages

### Server Configuration:
- Ensure proper MIME types for `.json` files
- Add caching headers for static assets
- Consider adding `Cache-Control` headers

## 🔍 Debugging

### Console Messages:
The PWA system logs detailed messages with `[PWA]` prefix:
- Service worker registration status
- Install prompt availability
- Standalone mode detection
- Cache operations

### Common Issues:
1. **Icons not loading**: Check file paths in `manifest.json`
2. **Service worker fails**: Check console for errors in `sw.js`
3. **Install prompt not showing**: Requires HTTPS and valid manifest
4. **Offline not working**: Check service worker caching strategy

## 📈 Future Enhancements

The PWA foundation supports:
- Push notifications
- Background sync
- Advanced caching strategies
- App shortcuts
- File handling
- Share target functionality

## 🛠️ Maintenance

### Updating the PWA:
1. Increment version in `sw.js` (`CACHE_NAME`)
2. Update cached files list if needed
3. Test service worker updates
4. Deploy new version

### User Updates:
- Users will automatically receive updates
- Update prompt can be customized in `showUpdateAvailable()`
- Forced updates available via `registration.waiting.postMessage()`

---

Your Preflop Builder is now PWA-ready! Add the icon files and deploy to HTTPS to enable full PWA functionality. 🎯
