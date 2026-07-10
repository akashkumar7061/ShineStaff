import webpush from 'web-push';
import User from '../models/User';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLL0kEmxeZDDOkzWOtmNCSsZR1eW-CTSue6BcqWgNTrhkeOsOinhAVyDbBfdw3ff9cLoD5rUGlZ-Qx_7CPQOBaI';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '1nNttIooIeSDqyug2M62mHuyQqqg6JJ_zvLS5zg4Y6A';

webpush.setVapidDetails(
  'mailto:support@shinestaff.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  url: string = '/'
) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({ title, body, url });
    const failedSubscriptions: string[] = [];

    await Promise.all(
      user.pushSubscriptions.map(async (subscription: any) => {
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (error: any) {
          // If subscription is expired or inactive (404 or 410), flag it for removal
          if (error.statusCode === 410 || error.statusCode === 404) {
            failedSubscriptions.push(subscription.endpoint);
          } else {
            console.error('Failed to send push notification to subscription endpoint:', subscription.endpoint, error.message);
          }
        }
      })
    );

    // Clean up failed subscriptions from database
    if (failedSubscriptions.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushSubscriptions: {
            endpoint: { $in: failedSubscriptions }
          }
        }
      });
    }
  } catch (err: any) {
    console.error('Push notification trigger error:', err.message);
  }
};

export const sendPushToAdmins = async (title: string, body: string, url: string = '/') => {
  try {
    const admins = await User.find({ role: 'admin' });
    await Promise.all(
      admins.map((admin) => sendPushNotification(admin._id.toString(), title, body, url))
    );
  } catch (err: any) {
    console.error('Failed to send push to admins:', err.message);
  }
};
