# Deployment Guide

Complete guide for deploying the RSS Feed Aggregator to GitHub Pages with Supabase backend.

## Prerequisites Checklist

- ✅ Supabase project created (`rss`)
- ✅ Database schema configured
- ✅ Feeds migrated to Supabase
- ✅ GitHub repository created
- ✅ Code pushed to main branch

## Step-by-Step Deployment

### Step 1: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

1. **SUPABASE_URL**
   - Value: `https://godeglzovkxzhwxyxbdd.supabase.co`

2. **SUPABASE_ANON_KEY**
   - Get from: Supabase Dashboard → Settings → API → anon public

3. **SUPABASE_SERVICE_KEY**
   - Get from: Supabase Dashboard → Settings → API → service_role
   - ⚠️ Keep this secret! It has admin access

See [GITHUB-SECRETS-SETUP.md](./GITHUB-SECRETS-SETUP.md) for details.

### Step 2: Enable GitHub Pages

1. Go to **Settings → Pages**
2. Under "Source", select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
3. Click **Save**

### Step 3: Enable Supabase Authentication (Optional - for Admin Panel)

1. Go to Supabase Dashboard
2. Navigate to **Authentication → Providers**
3. Enable **Email** provider
4. Create an admin user:
   - Go to **Authentication → Users**
   - Click **Add user** → **Create new user**
   - Enter email and password
   - Save

### Step 4: Trigger First Deployment

1. Go to **Actions** tab in GitHub
2. Click on **Generate RSS Feeds** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for workflow to complete (2-3 minutes)

### Step 5: Verify Deployment

After the workflow completes successfully:

1. **Check gh-pages branch**:
   - Should contain: `index.html`, `assets/`, RSS XML files

2. **Visit your site**:
   - URL: `https://arbnorcyberlabs-eng.github.io/rss-agg/`
   - Should show the feed reader with test data

3. **Test RSS feeds**:
   - `https://arbnorcyberlabs-eng.github.io/rss-agg/all.xml`
   - `https://arbnorcyberlabs-eng.github.io/rss-agg/funfacts.xml`

4. **Test admin panel**:
   - URL: `https://arbnorcyberlabs-eng.github.io/rss-agg/admin`
   - Login with your Supabase user credentials

## Automated Updates

The workflow runs automatically:
- **Twice daily**: 5:30 AM and 5:30 PM UTC
- **On push**: When you push to main/master branch
- **Manual**: Via GitHub Actions "Run workflow" button

## Troubleshooting

### Workflow Fails

**Check the logs**:
1. Go to Actions tab
2. Click on the failed run
3. Click on the failed step
4. Read error messages

**Common issues**:

1. **"Missing Supabase environment variables"**
   - Solution: Add SUPABASE_URL and SUPABASE_SERVICE_KEY secrets

2. **"Failed to fetch feeds from Supabase"**
   - Check Supabase project is active
   - Verify service role key is correct
   - Check database has feeds table

3. **"Build failed"**
   - Check frontend build logs
   - Verify all dependencies in package.json

### Page Not Loading

1. **Check GitHub Pages is enabled**
   - Settings → Pages → Source should be gh-pages

2. **Check gh-pages branch exists**
   - Should be created after first workflow run

3. **Check browser console for errors**
   - Press F12 → Console tab
   - Look for JavaScript errors

### RSS Feeds Not Updating

1. **Check workflow runs successfully**
   - Actions tab → should show green checkmark

2. **Check feeds.toml was generated**
   - View workflow logs for "Fetch feed configuration" step

3. **Manually trigger workflow**
   - Actions → Generate RSS Feeds → Run workflow

## Updating Feeds

### Via Admin Panel (Recommended)

1. Visit `https://arbnorcyberlabs-eng.github.io/rss-agg/admin`
2. Login with admin credentials
3. Add/Edit/Delete feeds
4. Wait for next automatic run, or manually trigger workflow

### Via Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to **Table Editor → feeds**
3. Add/edit feed records
4. Workflow will fetch new configuration on next run

## Next Steps

After successful deployment:

1. **Remove test data** from `FeedReaderView.vue`
2. **Implement RSS feed fetching** from GitHub Pages
3. **Test all features** end-to-end
4. **Monitor** automated runs

## Monitoring

Keep an eye on:
- **Actions tab**: Workflow runs should be green
- **GitHub Pages**: Site should be accessible
- **Supabase**: Database should be active
- **Feed URLs**: RSS feeds should return valid XML

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review workflow logs in Actions tab
3. Check Supabase logs
4. Verify all secrets are correctly set

