# GitHub Secrets Setup Guide

To enable automatic feed generation and deployment, you need to add the following secrets to your GitHub repository.

## Required Secrets

### 1. SUPABASE_URL
- **Value**: ``
- **Description**: Your Supabase project URL

### 2. SUPABASE_ANON_KEY
- **Value**: ``
- **Description**: Supabase anonymous/public key (used by frontend)

### 3. SUPABASE_SERVICE_KEY
- **Value**: Get from Supabase Dashboard
- **Description**: Supabase service role key (for backend/admin operations)
- **How to get**:
  1. Go to https://supabase.com/dashboard/project/***
  2. Click on Settings (gear icon) → API
  3. Scroll down to "Project API keys"
  4. Copy the `service_role` key (NOT the anon key)

## How to Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/arbnorcyberlabs-eng/rss-agg
2. Click on **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:
   - Name: `SUPABASE_URL`
   - Secret: `https://****.supabase.co`
   - Click **Add secret**
6. Repeat for `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_KEY`

## Verification

After adding all three secrets, you should see them listed in:
**Settings → Secrets and variables → Actions → Repository secrets**

- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY  
- ✅ SUPABASE_SERVICE_KEY

## Test the Workflow

Once secrets are added, test the workflow:

1. Go to **Actions** tab in your repository
2. Click on **Generate RSS Feeds** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for the workflow to complete (should take 2-3 minutes)
5. Check the **gh-pages** branch for the generated files

## Security Notes

⚠️ **IMPORTANT**:
- The `service_role` key has **admin access** to your Supabase database
- Never commit this key to the repository
- Never share it publicly
- Only use it in GitHub Actions secrets
- Rotate it immediately if compromised

## Troubleshooting

If the workflow fails:

1. Check the Actions logs for error messages
2. Verify all three secrets are correctly set
3. Ensure the service role key is correct (not the anon key)
4. Check Supabase project is active and accessible

