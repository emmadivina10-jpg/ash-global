import type { ComponentType } from 'react'
import { template as supportReplyTemplate } from './support-reply'
import { template as supportReceivedTemplate } from './support-received'
import { template as ashOutreachTemplate } from './ash-outreach'


export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'support-reply': supportReplyTemplate,
  'support-received': supportReceivedTemplate,
  'ash-outreach': ashOutreachTemplate,
}
