# Migration from Beta to Live Server

## URL Changes Made

**Old URL:** https://mattjonesactas.github.io/The-Big-One-Beta/
**New URL:** https://mattjonesactas.github.io/The-Big-One/

## Files Updated

### 1. InteractiveTutorial.tsx
**All tutorial image URLs updated:**
- Changed from: `https://github.com/MattJonesACTAS/The-Big-One-Beta/blob/main/public/tutorial/*.png?raw=true`
- Changed to: `https://github.com/MattJonesACTAS/The-Big-One/blob/main/public/tutorial/*.png?raw=true`

**Total URLs updated:** 17 instances (image references + preload array)

### 2. vite.config.ts
**Base URL updated:**
- Changed from: `base: '/The-Big-One-Beta/'`
- Changed to: `base: '/The-Big-One/'`

This ensures all built assets use the correct path.

## Deployment Checklist

✅ Update InteractiveTutorial.tsx
✅ Update vite.config.ts
✅ Upload tutorial images to `/public/tutorial/` folder
✅ Rebuild the app with `npm run build`
✅ Deploy to GitHub Pages

## Tutorial Images Required

Make sure these images are in your new repo at `/public/tutorial/`:
- 1.png
- 2.png
- 4.png
- 5.png
- 6.png
- 8.png

## No Other Changes Needed

All other functionality remains the same. The app will work identically on the live server.
