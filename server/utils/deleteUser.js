const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Property = require('../models/Property');
const Booking = require('../models/Booking');

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return require('stripe')(secretKey);
};

const deleteUserCascade = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (user.stripeSubscriptionId && ['active', 'trialing'].includes(user.subscriptionStatus)) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(user.stripeSubscriptionId, { prorate: true });
    } catch (stripeErr) {
      console.error('[deleteUserCascade] Stripe error:', stripeErr.message);
    }
  }

  if (user.profileImagePath && user.profileImagePath.includes('cloudinary')) {
    try {
      const { cloudinary } = require('./fileUpload');
      const urlParts = user.profileImagePath.split('/');
      const filenameWithExt = urlParts[urlParts.length - 1];
      const filename = filenameWithExt.split('.')[0];
      const publicId = 'profile-images/' + filename;
      cloudinary.uploader.destroy(publicId, (err) => {
        if (err) console.error('[deleteUserCascade] Cloudinary error:', err);
      });
    } catch (cloudErr) {
      console.error('[deleteUserCascade] Cloudinary err:', cloudErr.message);
    }
  }

  await RefreshToken.deleteMany({ userId: user._id });
  await AnalyticsEvent.updateMany({ userId: user._id }, { $set: { userId: null } });
  await Property.updateMany({ ownerHost: user._id }, { $set: { status: 'inactive' } });
  await Booking.updateMany(
    {
      $or: [{ guest: user._id }, { host: user._id }],
      checkIn: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] },
    },
    { $set: { status: 'cancelled' } }
  );

  await User.findByIdAndDelete(user._id);
  // todo create ticket for admin to notify support of deletion, and include user email and id in ticket content for reference (no PII in ticket content, just for support reference if needed) - will need to update Ticket schema to allow for nullable user ref or just not include user ref at all since it's not needed for anything, just for support reference if needed
};

module.exports = { deleteUserCascade };
