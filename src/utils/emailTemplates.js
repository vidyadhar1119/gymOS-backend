const memberExpiryEmail = (memberName, gymName, expiryDate, daysLeft) => {
    return {
        subject: `⚠️ Membership Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''} — ${gymName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 32px; border-radius: 12px;">
        
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #FF6B35; font-size: 28px; margin: 0;">💪 GymOS</h1>
          <p style="color: #888; margin: 4px 0 0;">Membership Renewal Reminder</p>
        </div>

        <div style="background: white; padding: 24px; border-radius: 8px; border-left: 4px solid #FF6B35;">
          <h2 style="color: #333; margin-top: 0;">Hello ${memberName},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Your membership at <strong>${gymName}</strong> is expiring in 
            <strong style="color: #FF6B35;">${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong> 
            on <strong>${expiryDate}</strong>.
          </p>
          <p style="color: #555; font-size: 16px;">
            Renew your membership to continue your fitness journey without any interruptions! 🏋️
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <div style="background: #FF6B35; color: white; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
              Contact your gym to renew →
            </div>
          </div>
        </div>

        <p style="text-align: center; color: #aaa; font-size: 12px; margin-top: 24px;">
          This is an automated reminder from ${gymName} via GymOS.
        </p>
      </div>
    `
    };
};

module.exports = { memberExpiryEmail };
