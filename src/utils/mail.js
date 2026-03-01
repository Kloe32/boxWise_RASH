import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import { formatDate } from "./helper.js";
import { env } from "../config/env.js";
const APP_NAME = "BoxWise";
const APP_LINK = process.env.APP_URL || "http://localhost:3030";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "salted",
    product: {
      name: APP_NAME,
      link: APP_LINK,
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: env.MAILTRAP_SMTP_HOST,
    port: env.MAILTRAP_SMTP_PORT,
    auth: {
      user: env.MAILTRAP_SMTP_USER,
      pass: env.MAILTRAP_SMTP_PASS,
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
  unitLabel,
  approvedReturnDate,
  endDate,
  outstandingPayment,
}) => {
  const table_content = [
    {
      title: "Outstanding Amount Details",
      data: [
        {
          item: "Outstanding Amount",
          price: `$ ${outstandingPayment?.amount}`,
          due_date: `${formatDate(outstandingPayment?.due_date)}`,
        },
      ],
      columns: {
        customWidth: {
          item: "40%",
          price: "30%",
          due_date: "30%",
        },
        customAlignment: {
          due_date: "right",
        },
      },
    },
  ];
  const paymentText = outstandingPayment
    ? `You are required to pay the outstanding amount of <strong>$ ${outstandingPayment.amount}</strong> before the move-out date.`
    : "Our records show that there are no outstanding payments for your booking. If you believe this is a mistake, please contact our support team.";

  return {
    body: {
      name: customerName,
      intro: [
        `Your early move-out request has been approved for your leased unit <strong>${unitLabel}</strong>.`,
        `Lease End Date: <strong>${formatDate(endDate)}</strong>`,
        `Approved move-out date: <strong>${formatDate(approvedReturnDate)}</strong>`,
        paymentText,
      ],
      table: outstandingPayment ? table_content : undefined,
      outro: [
        "Move-out process:",
        `1) Remove all belongings by <strong>${formatDate(approvedReturnDate)}</strong>.`,
        "2) Clean the unit and ensure no personal items remain.",
        `3) Return keys/access card at BoxWise Self-Storage (Main Office) - Bukit Batok Street 10, Singapore 621212.`,
        "5) Final inspection will be scheduled after key handover.",
        `Need help? Contact us at support@boxwise.asia.`,
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
  receipt,
  duration,
  initialPaymentDueDate,
  officeAddress,
  officeBankAccount,
  keyCollectionInstructions,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your booking request has been created successfully!`,
        `Booking ID:<strong> ${bookingId}</strong>.`,
        `Unit: <strong>${unitLabel}</strong>`,
        ` Period: <strong> ${formatDate(startDate)} to ${formatDate(endDate)}</strong>`,
      ],
      table: [
        {
          title: "Overall Charges",
          data: [
            {
              item: "Monthly Charge",
              price: `$ ${receipt?.breakdown?.monthly_charge}`,
            },
            {
              item: "duration",
              price: `${duration} months`,
            },
            {
              item: "Subtotal",
              price: `$ ${receipt?.subtotal}`,
            },
            {
              item: `GST (${receipt?.gst_rate || "0.09%"})`,
              price: `$ ${receipt?.gst}`,
            },
            {
              item: "Admin Fee",
              price: `$ ${receipt?.adminFee}`,
            },
            {
              item: "<strong>Total</strong>",
              price: `<strong>$ ${receipt?.total}</strong>`,
            },
          ],
          columns: {
            // Optionally, customize the column widths
            customWidth: {
              item: "20%",
              price: "15%",
            },
            // Optionally, change column text alignment
            customAlignment: {
              price: "right",
            },
          },
        },
        {
          title: "Initial Payment Due",
          data: [
            {
              item: "Initial Payment",
              price: `$ ${receipt?.breakdown?.initial_payment}`,
              due_date: formatDate(initialPaymentDueDate),
            },
          ],
          columns: {
            // Optionally, customize the column widths
            customWidth: {
              item: "40%",
              price: "30%",
              due_date: "30%",
            },
            // Optionally, change column text alignment
            customAlignment: {
              due_date: "right",
            },
          },
        },
      ],

      outro: [
        "<strong>Next steps:</strong>",
        `1) Pay initial payment by <strong>${formatDate(initialPaymentDueDate)}</strong>.`,
        "2) Wait for admin confirmation after payment verification.",
        `3) ${keyCollectionInstructions}.`,
        `<strong>Office address:</strong> ${officeAddress}.`,
        `<strong>Office bank account:</strong> ${officeBankAccount}.`,
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
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        "Welcome to BoxWise!",
        "Your booking is now confirmed. Get ready to experience hassle-free self-storage with us.",
        `Booking ID: <strong>${bookingId}</strong>`,
        `Unit: <strong>${unitLabel}</strong>`,
        `Period: <strong>${formatDate(startDate)} to ${formatDate(endDate)}</strong>`,
      ],
      action: {
        instructions:
          "<strong>Open your booking for payment schedule and booking details.</strong>",
        button: {
          color: "#576ce2",
          text: "Open Booking",
          link: `${APP_LINK}/dashboard`,
        },
      },
      outro: [
        "Please keep your payment schedule current to avoid service interruption.",
        `Need support? Contact support@boxwise.asia.`,
      ],
    },
  };
};

const paymentDueSoonReminderMailgenContent = ({
  customerName,
  unitLabel,
  amount,
  paymentType,
  dueDate,
  daysUntilDue,
}) => {
  const dueInText =
    typeof daysUntilDue === "number"
      ? `due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`
      : "due soon";
  const lastReminderText =
    daysUntilDue === 0
      ? `This is the last reminder. Your payment is due today for your unit <strong>${unitLabel}</strong>.`
      : "";
  return {
    body: {
      name: customerName,
      intro: [
        `Payment reminder: your payment for unit <strong>${unitLabel}</strong> is <strong>${dueInText}</strong>.`,
        `Payment: <strong>${paymentType}</strong>`,
        `Amount: <strong>$ ${amount}</strong>`,
        `Due date: <strong>${formatDate(dueDate)}</strong>`,
        `<strong style="color: red;">Please ensure that your payment is made on time to avoid any disruption to your service.</strong>`,
      ],

      outro: [
        "If you have any questions or need assistance, please contact our support team.",
        `Support email: support@boxwise.asia`,
      ],
    },
  };
};

const bookingEndDateActionMailgenContent = ({
  customerName,
  unitLabel,
  endDate,
  daysUntilEnd,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your lease for the unit <strong>${unitLabel}</strong> is ending in <strong>${daysUntilEnd} ${daysUntilEnd === 1 ? "day" : "days"}</strong>.`,
        `If you plan to move out, please make sure to complete the move-out process by the end date: <strong>${formatDate(endDate)}</strong>.`,
        `If you want to continue your stay, please submit a renewal request before the end date to avoid any service interruption.`,
        `If we do not receive a renewal request or move-out notice by the end date, your booking will be automatically marked as completed, and you may lose access to the unit. All the belongings will be delivered to the address on file after the end date, and you will be responsible for any additional fees incurred.`,
      ],
      action: {
        instructions:
          "Manage your booking and submit renewal/return requests through your dashboard:",
        button: {
          color: "#3869D4",
          text: "Go to Dashboard",
          link: `${APP_LINK}/dashboard`,
        },
      },
      outro: [
        "If you have any questions or need assistance, please contact our support team.",
        `Support email: support@boxwise.asia`,
      ],
    },
  };
};

const bookingCancelledMailgenContent = ({
  customerName,
  bookingId,
  unitLabel,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your booking has been cancelled.`,
        `Booking ID: <strong>${bookingId}</strong>`,
        `Unit: <strong>${unitLabel}</strong>`,
        `Please if you change your mind, you can always make a new booking with us!`,
      ],
      outro: [
        "If you have any questions or need assistance, please contact our support team.",
        `Support email: support@boxwise.asia`,
      ],
    },
  };
};

const bookingEndedMailgenContent = ({ customerName, unitLabel, endDate }) => {
  console.log("WE ARE HERE");
  return {
    body: {
      name: customerName,
      intro: [
        `Your lease for the unit <strong>${unitLabel}</strong> has ended on <strong>${formatDate(endDate)}</strong>.`,
        `We hope you had a great experience with BoxWise! If you need storage again in the future, we'd be happy to have you back.`,
      ],
      outro: [
        "If you have any questions or need assistance, please contact our support team.",
        `Support email: support@boxwise.asia`,
      ],
    },
  };
};

const vacatingNoticeMailgenContent = ({ customerName, unitLabel, endDate }) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your booking for unit <strong>${unitLabel}</strong> is ending on <strong>${formatDate(endDate)}</strong> — that's in <strong>2 days</strong>.`,
        `Since we have not received a renewal request or an early return notice, your booking has been marked as <strong>VACATING</strong>.`,
        `Please ensure you have removed all belongings from the unit by the end date. Any items left after the end date will be handled according to our storage policy.`,
      ],

      outro: [
        "If you have any questions or need assistance, please contact our support team.",
        `Support email: support@boxwise.asia`,
      ],
    },
  };
};

const renewalRequestedMailgenContent = ({
  customerName,
  bookingId,
  unitLabel,
  currentEndDate,
  requestedEndDate,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Your renewal request has been submitted successfully.`,
        `<strong>Booking ID:</strong> ${bookingId}`,
        `<strong>Unit:</strong> ${unitLabel}`,
        `<strong>Current End Date:</strong> ${formatDate(currentEndDate)}`,
        `<strong>Requested New End Date:</strong> ${formatDate(requestedEndDate)}`,
        `Our team will review your request and get back to you shortly.`,
      ],
      outro: [
        "If you have any questions or need assistance, please contact our support team.",
        `Support email: support@boxwise.asia`,
      ],
    },
  };
};

const renewalApprovedMailgenContent = ({
  customerName,
  bookingId,
  unitLabel,
  newEndDate,
  payments,
}) => {
  return {
    body: {
      name: customerName,
      intro: [
        `Great news! Your renewal request for unit <strong>${unitLabel}</strong> has been approved.`,
        `<strong>Booking ID:</strong> ${bookingId}`,
        `<strong>New End Date:</strong> ${formatDate(newEndDate)}`,
        `Below is the payment schedule for your renewed lease:`,
      ],
      table: {
        data: payments.map((p, idx) => ({
          "#": idx + 1,
          Description: p.description,
          Amount: `$${Number(p.amount).toFixed(2)}`,
          "Due Date": formatDate(p.due_date),
        })),
        columns: {
          customWidth: {
            "#": "5%",
            Description: "45%",
            Amount: "25%",
            "Due Date": "25%",
          },
        },
      },
      action: {
        instructions:
          "View your booking details and make payments through your dashboard:",
        button: {
          color: "#3869D4",
          text: "Go to Dashboard",
          link: `${APP_LINK}/dashboard`,
        },
      },
      outro: [
        "Please ensure payments are made by the due dates to avoid any service interruptions.",
        "If you have any questions or need assistance, please contact our support team.",
        `Support email: support@boxwise.asia`,
      ],
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  earlyMoveOutApprovalMailgenContent,
  bookingCreatedInfoMailgenContent,
  bookingConfirmedMailgenContent,
  bookingCancelledMailgenContent,
  paymentDueSoonReminderMailgenContent,
  bookingEndDateActionMailgenContent,
  bookingEndedMailgenContent,
  vacatingNoticeMailgenContent,
  renewalRequestedMailgenContent,
  renewalApprovedMailgenContent,
  sendEmail,
};
