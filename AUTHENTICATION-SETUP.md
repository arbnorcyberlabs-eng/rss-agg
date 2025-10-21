# Authentication Setup Guide

## Current Status

✅ **Completed:**
- Repository initialized
- Remote connected to: `https://github.com/arbnorcyberlabs-eng/rss-agg.git`
- All files staged and committed
- URLs updated to match repository name

❌ **Issue:** Permission denied when pushing to GitHub

## Problem

You're trying to push to the organization repository `arbnorcyberlabs-eng/rss-agg`, but Git is authenticating as user `morinaa` without proper credentials.

## Solution: Choose One Method

### **Method 1: Personal Access Token (PAT) - Recommended**

#### Step 1: Create a Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Settings:
   - **Note:** `RSS Agg Repository Access`
   - **Expiration:** Choose as needed (90 days recommended)
   - **Scopes:** Check `repo` (Full control of private repositories)
4. Click **"Generate token"**
5. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

#### Step 2: Use the Token to Push

Run this command in PowerShell:

```powershell
cd "C:\Users\arbnor.morina\OneDrive - PECB\Desktop\Testing\rss-agg"
git push -u origin main
```

When prompted:
- **Username:** `arbnorcyberlabs-eng` (or your GitHub username)
- **Password:** Paste your Personal Access Token (not your GitHub password!)

#### Step 3: Git will store the credentials for future use

---

### **Method 2: SSH Authentication**

#### Step 1: Generate SSH Key (if you don't have one)

```powershell
ssh-keygen -t ed25519 -C "arbnor.cyberlabs@gmail.com"
```

Press Enter to accept default location, optionally add a passphrase.

#### Step 2: Add SSH Key to GitHub

```powershell
# Copy the public key
Get-Content ~/.ssh/id_ed25519.pub | clip
```

1. Go to GitHub: https://github.com/settings/keys
2. Click **"New SSH key"**
3. Title: `RSS Agg Workspace`
4. Paste the key
5. Click **"Add SSH key"**

#### Step 3: Change Remote URL to SSH

```powershell
cd "C:\Users\arbnor.morina\OneDrive - PECB\Desktop\Testing\rss-agg"
git remote set-url origin git@github.com:arbnorcyberlabs-eng/rss-agg.git
```

#### Step 4: Push

```powershell
git push -u origin main
```

---

### **Method 3: Verify Repository Access**

Before trying authentication, verify you have write access to the repository:

1. Go to: https://github.com/arbnorcyberlabs-eng/rss-agg
2. Check if you're a member of `arbnorcyberlabs-eng` organization
3. Check repository settings to see if you have **Write** or **Admin** permissions

If you don't have access:
- Contact the organization admin to add you as a collaborator
- Or, fork the repository to your personal account

---

## After Successful Push

Once you can push successfully, continue with these commands:

```powershell
cd "C:\Users\arbnor.morina\OneDrive - PECB\Desktop\Testing\rss-agg"

# Create gh-pages branch
git checkout --orphan gh-pages
git reset --hard
git commit --allow-empty -m "Initial gh-pages commit"
git push origin gh-pages

# Return to main
git checkout main
```

Then enable GitHub Pages:
1. Go to: https://github.com/arbnorcyberlabs-eng/rss-agg/settings/pages
2. Source: **Deploy from a branch**
3. Branch: **gh-pages**, Folder: **/ (root)**
4. Click **Save**

## Quick Commands Reference

### Clear Windows Credential Manager (if needed)

```powershell
# Open Credential Manager
control /name Microsoft.CredentialManager

# Manually delete any GitHub credentials
# Then try pushing again
```

### Check Git Configuration

```powershell
git config --list | Select-String "user"
git remote -v
```

### Force Git to Ask for Credentials Again

```powershell
git config --unset credential.helper
git push -u origin main
```

---

## Need Help?

If you continue to have issues:
1. Verify you're logged into the correct GitHub account in your browser
2. Check if you have 2FA enabled (you'll need to use a PAT, not password)
3. Contact the `arbnorcyberlabs-eng` organization administrator

---

**Next Steps:** Choose Method 1 or Method 2 above and complete the authentication setup.

