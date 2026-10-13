import React from "react";
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  subject?: string;
  message?: string;
  ticketRef?: string;
}

const Email = ({ name, subject, message, ticketRef }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message — ASH Glo support</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ASH Glo</Text>
        <Heading style={h1}>We got your message</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
        <Text style={text}>
          Thanks for contacting ASH Glo support. Our team reviews requests in the order they arrive
          and will reply using the contact information you provided.
        </Text>
        <Hr style={hr} />
        <Text style={muted}>Subject</Text>
        <Text style={text}>{subject ?? "Support request"}</Text>
        {message ? (
          <>
            <Text style={muted}>Your message</Text>
            <Text style={quote}>{message}</Text>
          </>
        ) : null}
        {ticketRef ? <Text style={muted}>Reference: {ticketRef}</Text> : null}
        <Hr style={hr} />
        <Text style={muted}>ASH Glo — Refer. Earn. Discover. Grow.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "We received your message — ASH Glo support",
  displayName: "Support request received",
  previewData: {
    name: "Divine",
    subject: "Withdrawal is pending",
    message: "My withdrawal has been pending since yesterday.",
    ticketRef: "A1B2C3D4",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "28px 24px", maxWidth: "560px" };
const brand = {
  margin: "0 0 18px",
  fontSize: "13px",
  fontWeight: 800 as const,
  letterSpacing: "2px",
  color: "#E5484D",
  textTransform: "uppercase" as const,
};
const h1 = { margin: "0 0 14px", fontSize: "21px", lineHeight: "28px", color: "#141420" };
const text = { margin: "0 0 12px", fontSize: "15px", lineHeight: "23px", color: "#141420" };
const quote = { margin: "0 0 12px", fontSize: "13px", lineHeight: "20px", color: "#5b5b6b" };
const muted = { margin: "0 0 6px", fontSize: "12px", lineHeight: "18px", color: "#7a7a8c" };
const hr = { borderColor: "#eceaf0", margin: "20px 0" };
