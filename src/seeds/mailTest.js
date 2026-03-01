import e from "express";
import {
  sendEmail,
  bookingCreatedInfoMailgenContent,
  bookingConfirmedMailgenContent,
  bookingCancelledMailgenContent,
  paymentDueSoonReminderMailgenContent,
  bookingEndDateActionMailgenContent,
  earlyMoveOutApprovalMailgenContent,
  bookingEndedMailgenContent,
} from "../utils/mail.js";
const emailTest = async () => {
  //Booking Created Email Test
  // const emailContent = bookingCreatedInfoMailgenContent({
  //   customerName: "User",
  //   bookingId: "BOOKING__IGDSA1B2C3",
  //   unitLabel: "UNIT__A1B2C3",
  //   startDate: "2024-01-01",
  //   endDate: "2024-12-31",
  //   duration: 12,
  //   initialPaymentDueDate: "2024-01-01",

  //   receipt: {
  //     subtotal: 2400,
  //     gst_rate: "9%",
  //     gst: 216,
  //     total: 2616,
  //     adminFee: 0,
  //     breakdown: {
  //       monthly_charge: 200,
  //       initial_payment: 2616,
  //       recurring_months: 11,
  //     },
  //   },

  //   officeAddress:
  //     "BoxWise Self-Storage (Main Office) - Bukit Batok Street 10, Singapore 621212",
  //   officeBankAccount: "DBS Bank - BoxWise Bank Account - 012-345-6789",
  //   keyCollectionInstructions:
  //     "After payment, you can collect your access card and keys from our main office during business hours on the move-in date. Please bring a copy of this email and a valid ID for verification. If you have any questions, feel free to contact us at support@boxwise.asia",
  // });
  //Booking Confirmed Email Test
  // const emailContent = bookingConfirmedMailgenContent({
  //   customerName: "User",
  //   bookingId: "BOOKING__IGDSA1B2C3",
  //   unitLabel: "UNIT__A1B2C3",
  //   startDate: "2024-01-01",
  //   endDate: "2024-12-31",
  // });
  //Booking Cancelled Email Test
  // const emailContent = bookingCancelledMailgenContent({
  //   customerName: "User",
  //   bookingId: "BOOKING__IGDSA1B2C3",
  //   unitLabel: "UNIT__A1B2C3",
  // });
  //Payment Due Soon Reminder Email Test
  // const emailContent = paymentDueSoonReminderMailgenContent({
  //   customerName: "User",
  //   unitLabel: "UNIT__A1B2C3",
  //   dueDate: "2024-01-01",
  //   amount: 2616,
  //   paymentType: "Monthly Payment--1",
  // });
  // Booking Ending Reminder Email Test
  const emailContent = bookingEndedMailgenContent({
    customerName: "User",
    unitLabel: "UNIT__A1B2C3",
    endDate: "2024-01-01",
  });

  await sendEmail({
    email: "user@example.com",
    subject: "Payment Due Soon Reminder",
    mailgenContent: emailContent,
  });
};

emailTest().catch((e) => {
  console.error("Error sending test email:", e);
});
