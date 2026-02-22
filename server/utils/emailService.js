const sgMail = require('@sendgrid/mail');

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid Web API configured');
}

// Base email sender using SendGrid Web API
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY not configured');
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const msg = {
      to,
      from: {
        email: process.env.EMAIL_FROM || 'noreply@beds4crew.com',
        name: process.env.EMAIL_FROM_NAME || 'Beds4Crew'
      },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };
    
    const response = await sgMail.send(msg);
    
    console.log(`✅ Email sent to ${to}`);
    
    return { success: true, statusCode: response[0].statusCode };
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    if (error.response) {
      console.error("❌ SendGrid error:", error.response.body);
    }
    return { success: false, error: error.message };
  }
};

// Email templates
const emailTemplates = {
  // Welcome email for new users
  welcome: (firstName) => ({
    subject: "Welcome to Beds4Crew! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Welcome to Beds4Crew!</h1>
        <p>Hi ${firstName},</p>
        <p>Thank you for joining Beds4Crew! We're excited to have you as part of our community.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse and book accommodation worldwide</li>
          <li>List your property and host travelers</li>
          <li>Connect with crew members globally</li>
        </ul>
        <p style="margin-top: 30px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" 
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Start Exploring
          </a>
        </p>
        <p style="color: #666; margin-top: 30px;">Best regards,<br>The Beds4Crew Team</p>
      </div>
    `,
  }),

  // Email verification
  verifyEmail: (firstName, verificationToken) => ({
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Verify Your Email</h1>
        <p>Hi ${firstName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}" 
             style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #666; margin-top: 30px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
        <p style="color: #666;">This link will expire in 24 hours.</p>
      </div>
    `,
  }),

  // Password reset
  passwordReset: (firstName, resetToken) => ({
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Reset Your Password</h1>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}" 
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; margin-top: 30px;">
          If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
        <p style="color: #666;">This link will expire in 30 minutes.</p>
      </div>
    `,
  }),

  passwordChanged: (firstName) => ({
    subject: "Your Password Was Changed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">Password Updated</h1>
        <p>Hi ${firstName},</p>
        <p>Your Beds4Crew password was changed successfully.</p>
        <p style="color: #666; margin-top: 20px;">
          If you made this change, no further action is needed.
        </p>
        <p style="color: #666;">
          If you did not change your password, please reset it immediately and contact support.
        </p>
      </div>
    `,
  }),

  // Booking confirmation (for guest)
  bookingConfirmation: (guestName, propertyTitle, startDate, endDate, totalPrice, bookingId) => ({
    subject: `Booking Confirmed: ${propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4caf50;">Booking Confirmed! ✓</h1>
        <p>Hi ${guestName},</p>
        <p>Your booking has been confirmed!</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${propertyTitle}</h3>
          <p><strong>Check-in:</strong> ${new Date(startDate).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Total:</strong> $${totalPrice}</p>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
        </div>
        <p style="margin-top: 30px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/trips" 
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Booking Details
          </a>
        </p>
        <p style="color: #666; margin-top: 30px;">Have a great stay!<br>The Beds4Crew Team</p>
      </div>
    `,
  }),

  // New booking notification (for host)
  newBookingHost: (hostName, guestName, propertyTitle, startDate, endDate, totalPrice, bookingId) => ({
    subject: `New Booking Request: ${propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">New Booking Request!</h1>
        <p>Hi ${hostName},</p>
        <p>You have a new booking request from ${guestName}.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${propertyTitle}</h3>
          <p><strong>Guest:</strong> ${guestName}</p>
          <p><strong>Check-in:</strong> ${new Date(startDate).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Total:</strong> $${totalPrice}</p>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
        </div>
        <p style="margin-top: 30px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reservations" 
             style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Review Booking
          </a>
        </p>
        <p style="color: #666; margin-top: 30px;">Please respond to this booking request as soon as possible.</p>
      </div>
    `,
  }),

  // Booking cancelled
  bookingCancelled: (userName, propertyTitle, startDate, endDate, bookingId) => ({
    subject: `Booking Cancelled: ${propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f44336;">Booking Cancelled</h1>
        <p>Hi ${userName},</p>
        <p>Your booking has been cancelled.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${propertyTitle}</h3>
          <p><strong>Check-in:</strong> ${new Date(startDate).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
        </div>
        <p style="color: #666; margin-top: 30px;">
          If you have any questions, please contact support.
        </p>
      </div>
    `,
  }),

  // New message notification
  newMessage: (recipientName, senderName, propertyTitle, bookingId) => ({
    subject: `New Message from ${senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1976d2;">New Message</h1>
        <p>Hi ${recipientName},</p>
        <p>You have a new message from ${senderName} regarding your booking at ${propertyTitle}.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/trips" 
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Message
          </a>
        </p>
      </div>
    `,
  }),
};

// Convenient methods for sending specific email types
const emailService = {
  sendWelcomeEmail: async (email, firstName) => {
    const template = emailTemplates.welcome(firstName);
    return sendEmail({ to: email, ...template });
  },

  sendVerificationEmail: async (email, firstName, verificationToken) => {
    const template = emailTemplates.verifyEmail(firstName, verificationToken);
    return sendEmail({ to: email, ...template });
  },

  sendPasswordResetEmail: async (email, firstName, resetToken) => {
    const template = emailTemplates.passwordReset(firstName, resetToken);
    return sendEmail({ to: email, ...template });
  },

  sendPasswordChangedEmail: async (email, firstName) => {
    const template = emailTemplates.passwordChanged(firstName);
    return sendEmail({ to: email, ...template });
  },

  sendBookingConfirmation: async (email, guestName, propertyTitle, startDate, endDate, totalPrice, bookingId) => {
    const template = emailTemplates.bookingConfirmation(guestName, propertyTitle, startDate, endDate, totalPrice, bookingId);
    return sendEmail({ to: email, ...template });
  },

  sendNewBookingNotification: async (email, hostName, guestName, propertyTitle, startDate, endDate, totalPrice, bookingId) => {
    const template = emailTemplates.newBookingHost(hostName, guestName, propertyTitle, startDate, endDate, totalPrice, bookingId);
    return sendEmail({ to: email, ...template });
  },

  sendBookingCancellation: async (email, userName, propertyTitle, startDate, endDate, bookingId) => {
    const template = emailTemplates.bookingCancelled(userName, propertyTitle, startDate, endDate, bookingId);
    return sendEmail({ to: email, ...template });
  },

  sendNewMessageNotification: async (email, recipientName, senderName, propertyTitle, bookingId) => {
    const template = emailTemplates.newMessage(recipientName, senderName, propertyTitle, bookingId);
    return sendEmail({ to: email, ...template });
  },

  // Generic send for custom emails
  send: sendEmail,
};

module.exports = emailService;
