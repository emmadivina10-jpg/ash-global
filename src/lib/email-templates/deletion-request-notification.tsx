import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  reference?: string;
  scope?: string;
}
const Email = ({ reference, scope }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>New ASH Glo privacy request awaiting identity verification</Preview>
    <Body style={{ backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <Container style={{ padding: "28px 24px", maxWidth: "560px" }}>
        <Heading>ASH Glo deletion request</Heading>
        <Text>
          A public{" "}
          {scope === "PERSONALIZATION" ? "personalization data" : "account and personal data"}{" "}
          deletion request has been recorded.
        </Text>
        <Text>
          Reference: {reference}. Open the existing staff Support inbox to review the request.
        </Text>
        <Text>
          Identity has not been verified. Verify account ownership before acting. Never mark
          deletion complete until the requested data has actually been erased safely, with
          applicable legal retention.
        </Text>
      </Container>
    </Body>
  </Html>
);
export const template = {
  component: Email,
  subject: "ASH Glo deletion request — identity verification required",
  to: "privacy@ashglogroup.company",
  displayName: "Privacy request staff notification",
  previewData: { reference: "PREVIEW", scope: "ACCOUNT" },
} satisfies TemplateEntry;
