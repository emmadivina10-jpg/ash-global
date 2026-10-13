import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  subject?: string;
  message?: string;
  agent?: string;
  department?: string;
}

const LOGO = "https://ashglogroup.company/favicon.png";

const Email = ({ name, subject, message, agent, department }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject ?? "A message from ASH Glo"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO} width="44" height="44" alt="ASH Glo" style={logo} />
          <Text style={brand}>ASH GLO</Text>
          <Text style={brandSub}>{department ?? "Customer Support"}</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>{subject ?? "A message from ASH Glo"}</Heading>
          {(message ?? "").split("\n").map((line, index) =>
            line.trim() === "" ? (
              <Text key={index} style={spacer}>
                &nbsp;
              </Text>
            ) : (
              <Text key={index} style={text}>
                {line}
              </Text>
            ),
          )}

          <Hr style={hr} />
          <Text style={signature}>{agent ? `${agent} · ASH Glo` : "ASH Glo Team"}</Text>
        </Section>

        <Section style={footer}>
          <Text style={muted}>ASH Glo — Refer. Earn. Discover. Grow.</Text>
          <Text style={muted}>
            <Link href="https://ashglogroup.company" style={link}>
              ashglogroup.company
            </Link>
            {" · "}
            <Link href="mailto:support@ashglogroup.company" style={link}>
              support@ashglogroup.company
            </Link>
          </Text>
          <Text style={stamp}>
            Verified message from ASH Glo · {name ? `sent to ${name}` : "official"}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => data?.["subject"] || "A message from ASH Glo",
  displayName: "ASH Glo outreach",
  previewData: {
    name: "Divine",
    subject: "Welcome to ASH Glo",
    message: "Hi Divine,\n\nWelcome to ASH Glo. Your account is active.\n\nASH Glo Support",
    agent: "Grace",
    department: "Customer Support",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#f5f4f7",
  fontFamily: "Helvetica, Arial, sans-serif",
  padding: "24px 0",
};
const container = { maxWidth: "580px", margin: "0 auto", padding: "0 16px" };
const header = {
  background: "linear-gradient(135deg, #0f7a5a 0%, #17a06f 55%, #d9a441 100%)",
  backgroundColor: "#0f7a5a",
  borderRadius: "18px 18px 0 0",
  padding: "24px 24px 20px",
  textAlign: "center" as const,
};
const logo = { margin: "0 auto 8px", borderRadius: "12px", display: "block" };
const brand = {
  margin: "0",
  fontSize: "18px",
  fontWeight: 800 as const,
  letterSpacing: "4px",
  color: "#ffffff",
};
const brandSub = {
  margin: "4px 0 0",
  fontSize: "11px",
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  color: "#f3e6c4",
};
const card = {
  backgroundColor: "#ffffff",
  padding: "26px 26px 20px",
  borderLeft: "1px solid #e8e6ec",
  borderRight: "1px solid #e8e6ec",
};
const h1 = { margin: "0 0 16px", fontSize: "20px", lineHeight: "27px", color: "#14231d" };
const text = { margin: "0 0 10px", fontSize: "15px", lineHeight: "24px", color: "#20302a" };
const spacer = { margin: "0", fontSize: "8px", lineHeight: "8px", color: "#ffffff" };
const signature = { margin: "0", fontSize: "14px", fontWeight: 700 as const, color: "#0f7a5a" };
const hr = { borderColor: "#eceaf0", margin: "20px 0 14px" };
const footer = {
  backgroundColor: "#101a16",
  borderRadius: "0 0 18px 18px",
  padding: "18px 24px 20px",
  textAlign: "center" as const,
};
const muted = { margin: "0 0 4px", fontSize: "12px", lineHeight: "18px", color: "#b9c6c0" };
const link = { color: "#d9a441", textDecoration: "none" };
const stamp = {
  margin: "10px 0 0",
  fontSize: "10px",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
  color: "#7d8c85",
};
