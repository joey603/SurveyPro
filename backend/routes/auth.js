const sendVerificationEmail = async (email, verificationCode) => {
  console.log('Tentative d\'envoi d\'email de vérification à:', email);
  console.log('Code de vérification:', verificationCode);
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'SurveyFlow'
    },
    subject: 'Verify your SurveyFlow account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4a90e2; margin-bottom: 20px;">Welcome to SurveyFlow!</h1>
          <p style="font-size: 16px; color: #333;">Thank you for signing up on our platform.</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 30px;">
          <p style="font-size: 18px; margin-bottom: 15px;">Your verification code is:</p>
          <div style="background-color: #fff; padding: 15px; border-radius: 5px; display: inline-block; margin: 0 auto;">
            <h2 style="color: #4a90e2; margin: 0; letter-spacing: 5px;">${verificationCode}</h2>
          </div>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>This code will expire in 24 hours.</p>
          <p>If you did not create an account on SurveyFlow, you can ignore this email.</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
          <p>This is an automated email, please do not reply.</p>
          <p>© 2024 SurveyFlow. All rights reserved.</p>
        </div>
      </div>
    `,
    headers: {
      'X-SG-Category': 'verification',
      'X-SG-List-ID': 'verification_emails'
    }
  };

  try {
    console.log('Configuration de SendGrid avec la clé API...');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('Envoi de l\'email...');
    const response = await sgMail.send(msg);
    console.log('Email envoyé avec succès:', response);
  } catch (error) {
    console.error('Erreur détaillée lors de l\'envoi de l\'email:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    throw new Error('Erreur lors de l\'envoi de l\'email de vérification');
  }
}; 