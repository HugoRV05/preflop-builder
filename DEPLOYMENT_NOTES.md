# PWA iOS Standalone Mode Fix - Deployment Notes

## Changes Made (v2.1.0)

### 1. Fixed Manifest Configuration
- **Changed `start_url`**: From `"/"` to `"./"` to ensure proper path resolution on GitHub Pages
- **Maintained consistent scope**: Both `start_url` and `scope` now use relative paths `"./"`
- This prevents 404 errors when launching from iPhone Home Screen

### 2. Enhanced Service Worker (sw.js)
- **Updated version**: v2.0.0 → v2.1.0 to force cache invalidation
- **Enhanced navigation fallback**: Added multiple fallback strategies for iOS standalone mode
- **Improved error handling**: Better logging and recovery for failed navigation requests
- **iOS-specific fixes**: Added robust handling for standalone mode navigation issues

### 3. JavaScript Registration Updates (main.js)
- **Updated SW version**: Updated registration to use v2.1.0
- **Added iOS PWA enhancements**: New `enhancePWAForIOS()` function for standalone mode
- **Force update mechanism**: Added `forceServiceWorkerUpdate()` to ensure immediate updates
- **Enhanced navigation handling**: Better link handling in standalone mode

## Deployment Instructions

### 1. GitHub Pages Deployment
1. Commit and push all changes to your repository
2. Ensure GitHub Pages is enabled and pointing to the correct branch
3. Wait for GitHub Pages to rebuild (usually 2-5 minutes)

### 2. Testing the Fix
1. **Clear previous PWA installation**:
   - On iPhone: Delete the existing PWA from Home Screen
   - In Safari: Clear website data for your domain

2. **Test in Safari**:
   - Open https://hugorv05.github.io/preflop-builder/ in Safari
   - Verify all functionality works

3. **Test PWA Installation**:
   - In Safari, tap Share → Add to Home Screen
   - Install the PWA to Home Screen

4. **Test Standalone Mode**:
   - Launch from Home Screen icon
   - Verify it loads correctly (no 404 errors)
   - Test all navigation and functionality

### 3. Force Update for Existing Users
The version bump from 2.0.0 to 2.1.0 will automatically:
- Force service worker update
- Clear old caches
- Install new navigation handling

Users may need to:
1. Reload the page in Safari to get the update
2. Re-install the PWA if they have persistent issues

## Key Fixes Applied

### Root Cause: Path Configuration Mismatch
- **Problem**: `start_url: "/"` assumed root domain deployment
- **Solution**: Changed to `start_url: "./"` for GitHub Pages subpath compatibility

### iOS Standalone Mode Issues
- **Problem**: iOS handles navigation differently in standalone vs Safari
- **Solution**: Added specific iOS PWA navigation handling and multiple fallback strategies

### Service Worker Navigation Fallback
- **Problem**: Basic fallback insufficient for iOS standalone mode
- **Solution**: Enhanced with multiple fallback paths and network retry logic

## Verification Checklist

- [ ] Manifest uses consistent relative paths (`./`)
- [ ] Service worker version incremented to 2.1.0
- [ ] Enhanced navigation fallback implemented
- [ ] iOS-specific PWA enhancements added
- [ ] Force update mechanism included
- [ ] No linter errors
- [ ] Ready for GitHub Pages deployment

## Expected Results

After deployment:
1. ✅ PWA loads correctly from iPhone Home Screen
2. ✅ No 404 errors in standalone mode
3. ✅ All functionality identical to browser version
4. ✅ Existing users receive automatic update
5. ✅ New installations work immediately

## Monitoring

Check the browser console for:
- `[SW]` prefixed service worker logs
- `[PWA]` prefixed PWA functionality logs
- Any error messages during standalone mode operation

## Rollback Plan

If issues persist, revert to previous version by:
1. Changing `start_url` back to `"/"`
2. Reverting service worker version to 2.0.0
3. Removing iOS-specific enhancements

However, this fix addresses the root cause based on extensive research and should resolve the iOS PWA standalone mode issues.
