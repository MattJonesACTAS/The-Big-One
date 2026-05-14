# Quick Start - Deploy to GitHub Pages

## IMPORTANT: Configuration First!

Before deploying, you MUST update the base path to match your repository name.

### Update These Files:

**1. vite.config.ts** (line 10):
Change `/The-Big-One/` to `/YOUR-REPO-NAME/`

**2. public/manifest.json** (lines 4-5, 11, 15):
Change `/The-Big-One/` to `/YOUR-REPO-NAME/`

---

## Step 1: Extract Files
Extract all files from the archive to a folder on your computer.

## Step 2: Install Git (if not already installed)
- **Windows**: Download from https://git-scm.com/
- **Mac**: Install via Homebrew: `brew install git`
- **Linux**: `sudo apt install git`

## Step 3: Create GitHub Repository
1. Go to https://github.com/new
2. Name your repository (e.g., `cardiac-arrest-timer`)
3. Make it **Public** (required for free GitHub Pages)
4. **DO NOT** initialize with README, .gitignore, or license
5. Click "Create repository"

## Step 4: Push Code to GitHub

Open Terminal/Command Prompt in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

## Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar)
4. Under "Source", select **GitHub Actions**
5. Wait 2-3 minutes for the deployment to complete

## Step 6: Access Your App

Your app will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## Step 7: Install as App

On your phone/tablet:
- **iOS**: Open in Safari → Share → Add to Home Screen
- **Android**: Open in Chrome → Menu (⋮) → Add to Home Screen

## Troubleshooting

### Deployment fails
- Check the "Actions" tab in your repository for error messages
- Ensure you have GitHub Pages enabled in Settings

### App doesn't load
- Make sure the repository is **Public**
- Wait a few minutes after the first deployment
- Clear your browser cache and reload

### Updates not showing
- After pushing new code, wait 2-3 minutes for redeployment
- Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
- On mobile, delete the installed app and reinstall it

## Need Help?

Check the full README.md for more detailed instructions and project information.
