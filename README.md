# The Big One - Cardiac Arrest Timer

A professional cardiac arrest management tool with precision timers, treatment logging, and guided checklists for Reversibles, ROSC, and PHEA.

## Features

- **Precision Timer**: Tracks elapsed time and CPR rounds
- **Treatment Logging**: Records all interventions with timestamps
- **Guided Checklists**: Reversibles (H's & T's), ROSC, and PHEA protocols
- **PWA Support**: Install on your device for offline use
- **Auto-save**: All data persists locally

## Deploy to GitHub Pages

**IMPORTANT:** Before deploying, update the base path in `vite.config.ts` and `public/manifest.json` to match your repository name.

### 1. Update Configuration Files

If your repository name is different from "The-Big-One", update these files:

**vite.config.ts** - Line 10:
```typescript
base: mode === 'production' ? '/YOUR-REPO-NAME/' : './',
```

**public/manifest.json** - Lines 4-5:
```json
"start_url": "/YOUR-REPO-NAME/",
"scope": "/YOUR-REPO-NAME/",
```

**public/manifest.json** - Lines 11 and 15:
```json
"src": "/YOUR-REPO-NAME/icon-192.png",
"src": "/YOUR-REPO-NAME/icon-512.png",
```

### 2. Create Repository

1. Create a new repository on GitHub
2. Push this code to the repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically deploy your app

### 4. Access Your App

Your app will be available at:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically build and deploy whenever you push to the `main` branch.

## Install as PWA

Once deployed, you can install the app on your device:

- **iOS**: Safari → Share → Add to Home Screen
- **Android**: Chrome → Menu → Add to Home Screen  
- **Desktop**: Chrome/Edge → Install icon in address bar

## Run Locally

### Prerequisites
- Node.js 18+ 
- npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Font

The app uses the system font stack for optimal performance:
```css
-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif
```

## Project Structure

```
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   ├── types.ts         # TypeScript type definitions
│   └── index.css        # Global styles with Tailwind
├── public/
│   ├── manifest.json    # PWA manifest
│   ├── icon-192.png     # PWA icon (192x192)
│   ├── icon-512.png     # PWA icon (512x512)
│   └── apple-touch-icon.png  # iOS home screen icon
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions deployment workflow
└── vite.config.ts       # Vite configuration with PWA
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Motion** - Animation library
- **Lucide React** - Icon library
- **Vite PWA** - Progressive Web App support

## License

Apache-2.0
