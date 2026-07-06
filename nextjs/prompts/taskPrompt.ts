import type { UserSettings } from '@/types'
import { identity, text, type Inputs, type PromptSpec } from './common'

export function buildTaskPrompt(inputs: Inputs, settings: Partial<UserSettings>): PromptSpec[] {
  const { agent, brokerage, vaName } = identity(settings)
  const address = text(inputs.address, '[Address]')

  const templateMap: Record<string, string> = {
    new_buyer: `Create a detailed task checklist for onboarding a new buyer client named ${text(inputs.client_name, '[Client Name]')} in ${text(inputs.market_area, 'Northern Minnesota')}. Format as a numbered list of specific action items for ${agent} covering: initial consultation, pre-approval follow-up, setting up property search alerts, scheduling first showings, and maintaining weekly check-ins. Include who does each task (${agent} or ${vaName}).`,
    new_seller: `Create a task checklist for onboarding a new seller client named ${text(inputs.client_name, '[Client Name]')} at ${address}. Cover: signed listing agreement steps, photography scheduling, MLS input, social media launch, showing setup, and feedback collection system. Include ${agent} and ${vaName} assignments.`,
    new_listing: `Create a launch checklist for a new listing at ${address}, priced at ${text(inputs.price, '[Price]')}. Cover: MLS activation, social posts, email blast, Zillow and Realtor.com syndication, open house planning, and agent networking. Chronological order with a day-by-day timeline for the first week.`,
    pending_transaction: `Create a transaction coordination checklist for a property going under contract at ${address}. Cover: earnest money, inspection scheduling, appraisal, title order, lender milestones, buyer and seller communication touchpoints, and closing day prep. Include typical deadlines as placeholders.`,
    open_house_followup: `Create a post-open house follow-up task list for an open house at ${address}. Cover: same-day text to all sign-ins, next-day follow-up calls, CRM entry for each contact, social media recap post, seller debrief call, and lead scoring. Assign tasks to ${agent} and ${vaName}.`,
    new_recruit: `Create an onboarding task list for a new agent recruit named ${text(inputs.recruit_name, '[Agent Name]')} joining ${brokerage}. Cover: welcome call, MLS setup, technology onboarding, first week check-in, 30-day review schedule, mentorship assignments, and goal-setting session. Assign ${agent} tasks and ${vaName} admin tasks.`,
    weekly_accountability: `Create a weekly accountability checklist for ${agent}. Cover: prospecting calls, follow-up messages, social media posts, new listing checks, pipeline review, lead response audit, and one relationship-building activity. Format as a Monday through Friday breakdown.`,
    va_handoff: `Create a VA task handoff document for ${vaName} from ${agent}. Tasks to delegate: ${text(inputs.tasks, '[describe tasks]')}. Priority: ${text(inputs.priority, 'normal')}. For each task include: what to do, step-by-step instructions, what done looks like, and where to report results.`,
  }

  const template = text(inputs.template, 'new_buyer')
  const prompt = templateMap[template] ?? templateMap['new_buyer']

  return [{ id: template, label: 'Task Checklist', prompt }]
}
