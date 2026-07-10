export const sendSMSAlert = async (to: string, message: string) => {
  const isMock =
    !process.env.TWILIO_ACCOUNT_SID ||
    process.env.TWILIO_ACCOUNT_SID.startsWith('mock_') ||
    !process.env.TWILIO_AUTH_TOKEN ||
    process.env.TWILIO_AUTH_TOKEN.startsWith('mock_') ||
    !process.env.TWILIO_SMS_NUMBER;

  if (isMock) {
    console.log(`[MOCK SMS NOTIFICATION]
To: ${to}
Message: ${message}
`);
    return;
  }

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_SMS_NUMBER;
    const authString = Buffer.from(`${sid}:${token}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', from as string);
    params.append('Body', message);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('Twilio SMS API Error:', result);
    } else {
      console.log(`Twilio SMS sent. SID: ${result.sid}`);
    }
  } catch (err) {
    console.error('Failed to send SMS notification via Twilio:', err);
  }
};
