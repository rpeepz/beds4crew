# Email Not Sending - Debug Checklist

## 🔍 Step 1: Check Render Environment Variables

Go to: **Render Dashboard → Your Service → Environment**

Verify ALL these variables are set:
- [ ] `SMTP_HOST` = `smtp.sendgrid.net`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_SECURE` = `false`
- [ ] `SMTP_USER` = `apikey`
- [ ] `SMTP_PASSWORD` = Your SendGrid API key (starts with `SG.`)
- [ ] `EMAIL_FROM` = Your verified sender email
- [ ] `EMAIL_FROM_NAME` = `Beds4Crew`
- [ ] `CLIENT_URL` = Your Render URL

**After adding/changing variables, you MUST click "Save Changes" and wait for redeploy (~5-10 min)**

---

## 🔑 Step 2: Verify SendGrid API Key

1. Go to: https://app.sendgrid.com/settings/api_keys
2. Check if your API key exists
3. **Important:** If you viewed the key example in the docs, you need to DELETE it and create a NEW one
4. When creating: Choose "Full Access" permissions
5. Copy the key IMMEDIATELY (you can only see it once)
6. Paste into Render's `SMTP_PASSWORD` variable

---

## ✉️ Step 3: Verify Sender Email

Go to: https://app.sendgrid.com/settings/sender_auth/senders

- [ ] You have a verified sender
- [ ] The verification email was clicked
- [ ] Status shows "Verified"
- [ ] The email matches your `EMAIL_FROM` variable in Render

**The `EMAIL_FROM` variable in Render MUST match your verified sender exactly**

---

## 📋 Step 4: Check Render Logs

1. Go to: **Render Dashboard → Your Service → Logs**
2. Look for errors like:
   - `Email configuration missing`
   - `Invalid login`
   - `Unauthorized`
   - `Error sending email`
3. Filter logs around the time you tried to register/book

**Common errors:**
- "Invalid login" = Wrong `SMTP_USER` (should be exactly `apikey`)
- "Unauthorized" = Wrong API key in `SMTP_PASSWORD`
- "550 Unauthenticated senders not allowed" = Email not verified in SendGrid

---

## 🧪 Step 5: Test Email

Try these actions to trigger emails:

1. **Register a new user** (triggers welcome email)
   - Check: Should you see "User registered" in Render logs?
   - Check: Any email-related errors in logs?

2. **Check your spam folder**
   - SendGrid emails often land in spam initially

3. **Check SendGrid Activity Feed**
   - Go to: https://app.sendgrid.com/email_activity
   - Filter: Last 24 hours
   - Look for: Your test emails
   - Status: "Delivered" or "Bounced" or "Dropped"?

---

## 🏥 Quick Fixes

### Issue: "No emails in SendGrid Activity Feed"
**Cause:** Emails not reaching SendGrid (configuration problem)
**Fix:** Check that `SMTP_PASSWORD` is correct and redeploy

### Issue: "Emails show as 'Dropped' in SendGrid"
**Cause:** Sender not verified
**Fix:** Verify sender in SendGrid dashboard

### Issue: "Emails show as 'Bounced'"
**Cause:** Invalid recipient email
**Fix:** Use a real email address when registering

### Issue: "Server logs show 'Cannot find module emailService'"
**Cause:** Files not deployed
**Fix:** Run `git status`, commit, and push. Render auto-deploys.

---

## 📞 Next Steps

**Tell me:**
1. What do you see in Render logs when you register a user?
2. What's the status in SendGrid Activity Feed?
3. Which email address did you verify in SendGrid?

**Quick command to share logs:**
In Render dashboard, copy the last 20 lines of logs around registration time.
