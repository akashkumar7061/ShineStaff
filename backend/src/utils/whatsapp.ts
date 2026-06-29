export const sendWhatsAppAlert = async (to: string, message: string) => {
  const isMock = 
    !process.env.TWILIO_ACCOUNT_SID || 
    process.env.TWILIO_ACCOUNT_SID.startsWith('mock_') || 
    !process.env.TWILIO_AUTH_TOKEN || 
    process.env.TWILIO_AUTH_TOKEN.startsWith('mock_');

  if (isMock) {
    console.log(`[MOCK WHATSAPP NOTIFICATION]
To: ${to}
Message: ${message}
`);
    return;
  }

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';
    const authString = Buffer.from(`${sid}:${token}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', `whatsapp:${to}`);
    params.append('From', `whatsapp:${from}`);
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
      console.error('Twilio REST API Error:', result);
    } else {
      console.log(`Twilio WhatsApp sent. SID: ${result.sid}`);
    }
  } catch (err) {
    console.error('Failed to send WhatsApp notification via Twilio:', err);
  }
};
