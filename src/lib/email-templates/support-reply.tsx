import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  subject?: string
  reply?: string
  original?: string
  ticketRef?: string
}

const Email = ({ name, subject, reply, original, ticketRef }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`ASH Glo support replied about ${subject ?? 'your request'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ASH Glo</Text>
        <Heading style={h1}>{subject ? `Re: ${subject}` : 'Reply from ASH Glo support'}</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>

        <Section style={card}>
          {(reply ?? '').split('\n').map((line, index) => (
            <Text key={index} style={replyLine}>
              {line}
            </Text>
          ))}
        </Section>

        {original ? (
          <>
            <Hr style={hr} />
            <Text style={muted}>Your message</Text>
            <Text style={quote}>{original}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={muted}>
          Reply to this email to continue the conversation.
          {ticketRef ? ` Reference: ${ticketRef}` : ''}
        </Text>
        <Text style={muted}>ASH Glo — Refer. Earn. Discover. Grow.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.['subject'] ? `Re: ${data['subject']}` : 'Reply from ASH Glo support',
  displayName: 'Support reply',
  previewData: {
    name: 'Divine',
    subject: 'Withdrawal is pending',
    reply: 'Thanks for reaching out.\nYour withdrawal was approved and lands within 24 hours.',
    original: 'My withdrawal has been pending since yesterday.',
    ticketRef: 'A1B2C3D4',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = {
  margin: '0 0 18px',
  fontSize: '13px',
  fontWeight: 800 as const,
  letterSpacing: '2px',
  color: '#E5484D',
  textTransform: 'uppercase' as const,
}
const h1 = { margin: '0 0 14px', fontSize: '21px', lineHeight: '28px', color: '#141420' }
const text = { margin: '0 0 12px', fontSize: '15px', lineHeight: '23px', color: '#141420' }
const card = {
  backgroundColor: '#faf7fb',
  borderRadius: '14px',
  borderLeft: '3px solid #B5179E',
  padding: '16px 18px',
  margin: '0 0 16px',
}
const replyLine = { margin: '0 0 8px', fontSize: '15px', lineHeight: '23px', color: '#141420' }
const quote = { margin: '0 0 12px', fontSize: '13px', lineHeight: '20px', color: '#5b5b6b' }
const muted = { margin: '0 0 6px', fontSize: '12px', lineHeight: '18px', color: '#7a7a8c' }
const hr = { borderColor: '#eceaf0', margin: '20px 0' }
