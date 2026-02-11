# Email Integration Setup Guide

## Overview
The email service is now integrated into Beds4Crew for user authentication and booking notifications.

## Features
- ✅ Welcome emails on registration
- ✅ Email verification (template ready) 
- ✅ Password reset emails (template ready)
- ✅ Booking confirmation emails
- ✅ New booking notifications for hosts
- ✅ Booking cancellation emails
- ✅ Message notifications (template ready)

## Quick Setup

### 1. Install Dependencies
```bash
cd server
npm install nodemailer
```

### 2. Configure Environment Variables

Copy the example configuration from `.env.example` and set your SMTP credentials in `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com              # or your email provider
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@beds4crew.com
EMAIL_FROM_NAME=Beds4Crew
CLIENT_URL=http://localhost:5173
```

### 3. Email Provider Options

#### **Option 1: Gmail (Development)**
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASSWORD`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

#### **Option 2: Ethereal Email (Testing)**
Perfect for testing without sending real emails:
1. Visit https://ethereal.email/create
2. Copy the SMTP credentials
3. All emails will be caught and viewable at ethereal.email

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-username
SMTP_PASSWORD=your-ethereal-password
```

#### **Option 3: SendGrid (Production)**
Reliable transactional email service with good free tier:
1. Sign up at https://sendgrid.com
2. Create an API key
3. Configure:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### **Option 4: Mailgun (Production)**
Another great option for production:
1. Sign up at https://mailgun.com
2. Get SMTP credentials from your domain settings

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
```

#### **Option 5: AWS SES (Production)**
Cost-effective for high volume:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key-id
SMTP_PASSWORD=your-aws-secret-access-key
```

### 4. Test the Integration

After configuration, test by:
1. Registering a new user (should receive welcome email)
2. Creating a booking (guest and host receive emails)
3. Confirming a booking (guest receives confirmation)
4. Cancelling a booking (both parties notified)

Check your console logs for email status and preview URLs (in development).

## Email Templates

All email templates are in `/server/utils/emailService.js` and include:

### Currently Active:
- **Welcome Email** - Sent on registration
- **Booking Confirmation** - Sent when booking is created/confirmed
- **New Booking Notification** - Sent to host for new requests
- **Booking Cancellation** - Sent to both parties on cancellation

### Ready to Implement:
- **Email Verification** - Call `emailService.sendVerificationEmail()`
- **Password Reset** - Call `emailService.sendPasswordResetEmail()`
- **New Message** - Call `emailService.sendNewMessageNotification()`

## Usage Examples

### Send Custom Email
```javascript
const emailService = require('../utils/emailService');

// Using predefined templates
await emailService.sendWelcomeEmail(email, firstName);
await emailService.sendPasswordResetEmail(email, firstName, resetToken);

// Send custom email
await emailService.send({
  to: 'user@example.com',
  subject: 'Custom Email',
  html: '<h1>Hello!</h1><p>This is a custom email.</p>',
  text: 'Hello! This is a custom email.'
});
```

### Add New Email Template
Edit `/server/utils/emailService.js`:

```javascript
// Add to emailTemplates object
myCustomTemplate: (data) => ({
  subject: `Subject with ${data.variable}`,
  html: `<div>Your HTML template</div>`,
}),

// Add convenience method
sendMyCustomEmail: async (email, data) => {
  const template = emailTemplates.myCustomTemplate(data);
  return sendEmail({ to: email, ...template });
},
```

## Email Best Practices

1. **Non-blocking**: All emails are sent asynchronously and won't block API responses
2. **Error Handling**: Failed emails are logged but don't cause API failures
3. **HTML + Text**: All templates include both HTML and text versions
4. **Responsive**: Email templates use inline CSS for compatibility
5. **Security**: Never send sensitive data in emails (use tokens/links instead)

## Troubleshooting

### Emails Not Sending
1. Check console logs for error messages
2. Verify SMTP credentials in `.env`
3. Check spam folder
4. Ensure firewall allows outbound SMTP (port 587)
5. For Gmail, ensure App Password is used (not regular password)

### Preview URLs Not Showing
Preview URLs only work with Ethereal Email in development mode.

### Emails in Spam
- Set up SPF, DKIM, and DMARC records (production only)
- Use a transactional email service (SendGrid, Mailgun)
- Avoid spammy words in subject lines
- Include unsubscribe link for marketing emails

## Production Checklist

Before deploying to production:

- [ ] Use a production email service (SendGrid, Mailgun, AWS SES)
- [ ] Set up proper domain authentication (SPF, DKIM, DMARC)
- [ ] Update `EMAIL_FROM` to use your domain
- [ ] Update `CLIENT_URL` to production URL
- [ ] Test all email flows in production environment
- [ ] Set up email delivery monitoring
- [ ] Consider adding email queue (Bull, BullMQ) for high volume
- [ ] Add unsubscribe functionality for marketing emails
- [ ] Implement rate limiting for email sends

## Future Enhancements

Consider adding:
- Email queue system (Bull/BullMQ) for better reliability
- Email templates using a templating engine (Handlebars, EJS)
- Email open tracking
- Scheduled/recurring emails
- Email preferences for users
- Bulk email capability
- Multi-language support

## Support

For email provider specific issues, refer to:
- Gmail: https://support.google.com/mail/answer/7126229
- SendGrid: https://docs.sendgrid.com
- Mailgun: https://documentation.mailgun.com
- AWS SES: https://docs.aws.amazon.com/ses
