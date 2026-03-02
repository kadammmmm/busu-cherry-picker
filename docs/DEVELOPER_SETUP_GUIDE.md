# WxCC Cherry Picker Widget - Developer Setup Guide

## Building the App & Creating Your GitHub Repository

**Estimated Time:** 20-30 minutes  
**Skill Level:** Basic familiarity with VS Code and Git

---

## Overview

This guide walks you through setting up the Cherry Picker Widget project on your local machine, testing it, and publishing it to your own GitHub repository.

---

## Table of Contents

1. [Prerequisites](#step-1-prerequisites)
2. [Set Up Your Local Environment](#step-2-set-up-your-local-environment)
3. [Create the Project Structure](#step-3-create-the-project-structure)
4. [Install Dependencies & Build](#step-4-install-dependencies--build)
5. [Test Locally](#step-5-test-locally)
6. [Create GitHub Repository](#step-6-create-github-repository)
7. [Push to GitHub](#step-7-push-to-github)
8. [Next Steps](#step-8-next-steps)

---

## Step 1: Prerequisites

### Install Required Software

| Software | Download Link | Verify Installation |
|----------|---------------|---------------------|
| **VS Code** | https://code.visualstudio.com | Open VS Code |
| **Node.js 18+** | https://nodejs.org (LTS version) | `node --version` |
| **Git** | https://git-scm.com | `git --version` |
| **GitHub Account** | https://github.com/signup | Log in to GitHub |

### Recommended VS Code Extensions

Open VS Code and install these extensions (Ctrl+Shift+X):

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **GitLens** - Git integration
- **REST Client** - API testing (optional)

---

## Step 2: Set Up Your Local Environment

### 2.1 Create Project Folder

Open a terminal (Command Prompt, PowerShell, or Terminal) and run:

```bash
# Create a new folder for your project
mkdir busu-cherry-picker
cd busu-cherry-picker
```

### 2.2 Open in VS Code

```bash
# Open the folder in VS Code
code .
```

Or manually: Open VS Code > File > Open Folder > Select `busu-cherry-picker`

---

## Step 3: Create the Project Structure

### 3.1 Create Folder Structure

In VS Code, create the following folders and files. You can right-click in the Explorer panel and select "New Folder" or "New File".

```
busu-cherry-picker/
├── src/
│   ├── build/           (created automatically by webpack)
│   └── widget-SDK-Voice.js
├── public/
│   └── img/
│       └── loading-1.gif
├── config/
│   └── desktop-layout.json
├── flow/
│   └── GenericCherryPickerFlow.json
├── docs/
│   └── DEPLOYMENT_GUIDE.md
├── index.js
├── package.json
├── webpack.config.cjs
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .env                 (local only - do not commit)
├── .gitignore
└── README.md
```

### 3.2 Create .gitignore

Create a file named `.gitignore` in the root folder:

```gitignore
# Dependencies
node_modules/

# Environment variables (contains secrets)
.env

# Build output (optional - some prefer to commit this)
# src/build/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log
npm-debug.log*

# Optional: local testing
*.local
```

### 3.3 Create package.json

Create `package.json` in the root folder:

```json
{
  "name": "busu-cherry-picker",
  "version": "1.0.0",
  "description": "WxCC Voice Queue Cherry Picker Widget - Allows agents to view and claim queued voice calls",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "build": "webpack --config webpack.config.cjs",
    "build:watch": "webpack --config webpack.config.cjs --watch",
    "dev": "nodemon index.js",
    "start": "node index.js"
  },
  "keywords": [
    "webex",
    "contact-center",
    "wxcc",
    "cherry-picker",
    "widget",
    "cisco"
  ],
  "author": "B+S Solutions",
  "license": "MIT",
  "dependencies": {
    "@wxcc-desktop/sdk": "^1.2.10",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "socket.io": "^4.8.1",
    "ttl-mem-cache": "^4.1.0"
  },
  "devDependencies": {
    "@wxcc-desktop/sdk-types": "^1.0.3",
    "babel-loader": "^9.1.3",
    "dotenv-webpack": "^8.0.1",
    "nodemon": "^3.0.2",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4"
  }
}
```

### 3.4 Create webpack.config.cjs

Create `webpack.config.cjs` in the root folder:

```javascript
const path = require("path");
const Dotenv = require("dotenv-webpack");

const config = {
  mode: "production",
  entry: "./src/widget-SDK-Voice.js",
  output: {
    path: path.resolve(__dirname, "src/build"),
    filename: "bundle.js",
    publicPath: "build/"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  plugins: [
    new Dotenv({
      systemvars: true
    })
  ]
};

module.exports = config;
```

### 3.5 Create .env.example

Create `.env.example` in the root folder:

```ini
# Server Configuration
PORT=5000

# REQUIRED: Your public server URL
# Examples:
#   Local: http://localhost:5000
#   Render: https://your-app-name.onrender.com
HOST_URI=http://localhost:5000

# WxCC Desktop URLs for CORS (comma-separated for multiple regions)
CORS_ORIGINS=https://desktop.wxcc-us1.cisco.com

# Logging level: error, warn, info, debug
LOG_LEVEL=info
```

### 3.6 Create .env (Local Development)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Or manually create `.env` with:

```ini
PORT=5000
HOST_URI=http://localhost:5000
CORS_ORIGINS=https://desktop.wxcc-us1.cisco.com
LOG_LEVEL=debug
```

### 3.7 Create the Server (index.js)

Create `index.js` in the root folder. Copy the server code from the provided files.

### 3.8 Create the Widget (src/widget-SDK-Voice.js)

Create `src/widget-SDK-Voice.js`. Copy the widget code from the provided files.

### 3.9 Create Desktop Layout (config/desktop-layout.json)

Create `config/desktop-layout.json`. Copy the layout JSON from the provided files.

### 3.10 Create README.md

Create `README.md` in the root folder:

```markdown
# WxCC Voice Cherry Picker Widget

Allows Webex Contact Center agents to view and selectively claim (cherry-pick) voice calls from the queue.

## Features

- Real-time queue visibility
- One-click call claiming
- Caller ID display
- Dark mode support
- Filter by call status

## Quick Start

1. Fork this repository
2. Deploy to Render.com (see docs/DEPLOYMENT_GUIDE.md)
3. Configure your WxCC queue and flow
4. Add the widget to your desktop layout

## Documentation

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for complete setup instructions.

## License

MIT
```

---

## Step 4: Install Dependencies & Build

### 4.1 Open Terminal in VS Code

Press `` Ctrl+` `` (backtick) to open the integrated terminal.

### 4.2 Install Dependencies

```bash
npm install
```

You should see output like:
```
added 150 packages in 10s
```

### 4.3 Build the Widget Bundle

```bash
npm run build
```

You should see:
```
asset bundle.js 250 KiB [emitted] [minimized]
webpack compiled successfully
```

This creates `src/build/bundle.js` - the compiled widget.

---

## Step 5: Test Locally

### 5.1 Start the Server

```bash
npm run dev
```

You should see:
```
[INFO] Cherry Picker Server started
[INFO] Port: 5000
[INFO] Host URI: http://localhost:5000
```

### 5.2 Test Health Endpoint

Open your browser and go to:
```
http://localhost:5000/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-02-26T12:00:00.000Z",
  "version": "2.0.0"
}
```

### 5.3 Test Widget Bundle

Go to:
```
http://localhost:5000/build/bundle.js
```

You should see the compiled JavaScript code.

### 5.4 Stop the Server

Press `Ctrl+C` in the terminal.

---

## Step 6: Create GitHub Repository

### 6.1 Go to GitHub

1. Open https://github.com
2. Sign in to your account

### 6.2 Create New Repository

1. Click the **"+"** icon in the top right
2. Select **"New repository"**

### 6.3 Configure Repository

| Setting | Value |
|---------|-------|
| **Repository name** | `busu-cherry-picker` |
| **Description** | `WxCC Voice Queue Cherry Picker Widget - Allows agents to view and claim queued voice calls` |
| **Visibility** | Public (or Private if you prefer) |
| **Initialize** | Leave ALL checkboxes UNCHECKED (no README, no .gitignore, no license) |

> **Important:** Do NOT initialize with README, .gitignore, or license - we already have these files locally.

### 6.4 Click "Create repository"

You'll see a page with instructions. Keep this page open - you'll need the repository URL.

---

## Step 7: Push to GitHub

### 7.1 Initialize Git Repository

In VS Code terminal:

```bash
# Initialize git in your project folder
git init
```

### 7.2 Add All Files

```bash
# Stage all files for commit
git add .
```

### 7.3 Create First Commit

```bash
# Commit with a message
git commit -m "Initial commit: WxCC Cherry Picker Widget"
```

### 7.4 Set Main Branch

```bash
# Rename branch to 'main' (GitHub's default)
git branch -M main
```

### 7.5 Add Remote Repository

Copy the repository URL from GitHub (looks like `https://github.com/YOUR_USERNAME/busu-cherry-picker.git`) and run:

```bash
# Add GitHub as remote origin
git remote add origin https://github.com/YOUR_USERNAME/busu-cherry-picker.git
```

### 7.6 Push to GitHub

```bash
# Push your code to GitHub
git push -u origin main
```

You may be prompted to authenticate:
- **Option A:** Enter your GitHub username and a Personal Access Token (not your password)
- **Option B:** Use GitHub CLI (`gh auth login`)
- **Option C:** Use VS Code's GitHub authentication prompt

### 7.7 Verify on GitHub

1. Go to your GitHub repository
2. Refresh the page
3. You should see all your files!

---

## Step 8: Next Steps

### Your Repository is Ready!

You now have a GitHub repository at:
```
https://github.com/YOUR_USERNAME/busu-cherry-picker
```

### Update Documentation

Update these files with your actual repository URL:

1. **docs/DEPLOYMENT_GUIDE.md** - Step 2.1 (Fork the Repository)
2. **README.md** - Any links to the repo

### Deploy to Render.com

Follow the [Deployment Guide](./DEPLOYMENT_GUIDE.md) to deploy your app to Render.com.

### Making Changes

When you make changes to your code:

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Description of what you changed"

# Push to GitHub
git push
```

### Enable GitHub Actions (Optional)

You can add CI/CD by creating `.github/workflows/deploy.yml` for automatic deployments.

---

## Quick Reference: Git Commands

| Command | Purpose |
|---------|---------|
| `git status` | See what files have changed |
| `git add .` | Stage all changes |
| `git add filename` | Stage specific file |
| `git commit -m "message"` | Commit staged changes |
| `git push` | Push commits to GitHub |
| `git pull` | Pull latest from GitHub |
| `git log --oneline` | View commit history |

---

## Quick Reference: npm Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run build` | Build widget bundle |
| `npm run dev` | Start server with hot-reload |
| `npm start` | Start server (production) |

---

## Troubleshooting

### "npm: command not found"

Node.js is not installed or not in your PATH. Reinstall Node.js from https://nodejs.org

### "git: command not found"

Git is not installed. Install from https://git-scm.com

### Build Fails with Webpack Error

Try deleting `node_modules` and reinstalling:

```bash
rm -rf node_modules
npm install
npm run build
```

### "Permission denied" on Git Push

You need to authenticate with GitHub. Options:
1. Use a Personal Access Token instead of password
2. Set up SSH keys
3. Use GitHub CLI: `gh auth login`

### Port 5000 Already in Use

Either stop the other process using port 5000, or change the PORT in `.env`:

```ini
PORT=5001
```

---

## Project File Summary

After completing this guide, your project should have:

```
busu-cherry-picker/
├── node_modules/        (created by npm install)
├── src/
│   ├── build/
│   │   └── bundle.js    (created by npm run build)
│   └── widget-SDK-Voice.js
├── public/
│   └── img/
├── config/
│   └── desktop-layout.json
├── docs/
│   └── DEPLOYMENT_GUIDE.md
├── index.js
├── package.json
├── package-lock.json    (created by npm install)
├── webpack.config.cjs
├── Dockerfile
├── docker-compose.yml
├── .env                 (local only, not in git)
├── .env.example
├── .gitignore
└── README.md
```

---

**You're all set!** Your Cherry Picker Widget is now version-controlled on GitHub and ready for deployment.
