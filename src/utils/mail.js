import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const APP_NAME = "BoxWise";
const APP_LINK = process.env.APP_URL || "https://boxwise.asia";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: APP_NAME,
      link: APP_LINK,
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "<no-reply@boxwise.asia>",
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      "Email service failed siliently. Make sure that you have provided your MAILTRAP credentials in the .env file",
    );
    console.error("Error: ", error);
  }
};

const emailVerificationMailgenContent = (username, verficationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we'are excited to have you on board.",

      action: {
        instructions:
          "To verify your email please click on the following button",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verficationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions:
          "To reset your password click on the following button or link",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const earlyMoveOutApprovalMailgenContent = ({
  customerName,
  bookingId,
  unitLabel,
  approvedReturnDate,
  keyReturnLocation,
  officeHours,
  supportEmail,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your early move-out request has been approved for booking ${bookingId}.`,
        `Unit: ${unitLabel}`,
        `Approved move-out date: ${approvedReturnDate}`,
      ],
      action: {
        instructions:
          "Please review your move-out checklist and complete all steps before the approved date.",
        button: {
          color: "#22BC66",
          text: "View Booking",
          link: `${APP_LINK}/bookings/${bookingId}`,
        },
      },
      outro: [
        "Move-out process:",
        `1) Remove all belongings by ${approvedReturnDate}.`,
        "2) Clean the unit and ensure no personal items remain.",
        `3) Return keys/access card at ${keyReturnLocation}.`,
        `4) Key return desk hours: ${officeHours}.`,
        "5) Final inspection will be scheduled after key handover.",
        `Need help? Contact us at ${supportEmail}.`,
      ],
    },
  };
};

const bookingCreatedInfoMailgenContent = ({
  customerName,
  bookingId,
  unitLabel,
  startDate,
  endDate,
  receiptRows = [],
  initialPaymentAmount,
  initialPaymentDueDate,
  officeAddress,
  officeBankAccount,
  keyCollectionInstructions,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your booking request has been created successfully (Booking ID: ${bookingId}).`,
        `Unit: ${unitLabel}`,
        `Period: ${startDate} to ${endDate}`,
      ],
      table: {
        data:
          receiptRows.length > 0
            ? receiptRows
            : [
                {
                  Item: "Initial Payment",
                  Amount: initialPaymentAmount,
                  Due: initialPaymentDueDate,
                },
              ],
      },
      action: {
        instructions: "Please complete your initial payment before the due date.",
        button: {
          color: "#22BC66",
          text: "Pay Now",
          link: `${APP_LINK}/bookings/${bookingId}`,
        },
      },
      outro: [
        "Next steps:",
        `1) Pay initial payment by ${initialPaymentDueDate}.`,
        "2) Wait for admin confirmation after payment verification.",
        `3) Key collection: ${keyCollectionInstructions}.`,
        `Office address: ${officeAddress}.`,
        `Office bank account: ${officeBankAccount}.`,
      ],
    },
  };
};

const bookingConfirmedMailgenContent = ({
  customerName,
  bookingId,
  unitLabel,
  startDate,
  endDate,
  keyCollectionInstructions,
  officeAddress,
  supportEmail,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        "Your booking is now confirmed. Welcome to BoxWise.",
        `Booking ID: ${bookingId}`,
        `Unit: ${unitLabel}`,
        `Term: ${startDate} to ${endDate}`,
      ],
      action: {
        instructions: "Open your booking for payment schedule and booking details.",
        button: {
          color: "#22BC66",
          text: "Open Booking",
          link: `${APP_LINK}/bookings/${bookingId}`,
        },
      },
      outro: [
        `Key collection details: ${keyCollectionInstructions}.`,
        `Office address: ${officeAddress}.`,
        "Please keep your payment schedule current to avoid service interruption.",
        `Need support? ${supportEmail}.`,
      ],
    },
  };
};

const paymentDueSoonReminderMailgenContent = ({
  customerName,
  bookingId,
  paymentType,
  amount,
  dueDate,
  paymentLink,
  graceNote = "Please pay on or before the due date to avoid penalties.",
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Payment reminder: your ${paymentType} is due soon.`,
        `Booking ID: ${bookingId}`,
        `Amount: ${amount}`,
        `Due date: ${dueDate}`,
      ],
      action: {
        instructions: "Use the link below to complete payment.",
        button: {
          color: "#FFB200",
          text: "Pay Due Amount",
          link: paymentLink || `${APP_LINK}/bookings/${bookingId}`,
        },
      },
      outro: [graceNote],
    },
  };
};

const bookingEndDateActionMailgenContent = ({
  customerName,
  bookingId,
  unitLabel,
  endDate,
  manageBookingLink,
  vacateSummary = "If you plan to move out, request early vacate or confirm your move-out process.",
  renewSummary = "If you want to continue, submit a renewal request before the end date.",
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your booking is nearing its end date (${endDate}).`,
        `Booking ID: ${bookingId}`,
        `Unit: ${unitLabel}`,
      ],
      action: {
        instructions:
          "Choose your next step now: vacate the unit or request renewal.",
        button: {
          color: "#3869D4",
          text: "Choose Vacate or Renew",
          link: manageBookingLink || `${APP_LINK}/bookings/${bookingId}`,
        },
      },
      outro: [vacateSummary, renewSummary],
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  earlyMoveOutApprovalMailgenContent,
  bookingCreatedInfoMailgenContent,
  bookingConfirmedMailgenContent,
  paymentDueSoonReminderMailgenContent,
  bookingEndDateActionMailgenContent,
  sendEmail,
};
