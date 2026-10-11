/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { TFunction } from 'i18next'

export interface Plan {
  id: string
  name: string
  tagline: string
  /** Monthly price in USD. */
  price: number
  /** Shown above the price for tiers sold at several usage levels. */
  priceNote?: string
  /** Lead-in above the feature list, e.g. "Everything in Plus, and:". */
  includes: string
  /** Icon beside the lead-in: the top tier gets a gem, the rest a sparkle. */
  includesIcon: 'sparkle' | 'gem'
  features: string[]
  cta: string
}

/** ChatGPT subscription ladder: Go, Plus and Pro, priced monthly in USD. */
export function buildPlans(t: TFunction): Plan[] {
  return [
    {
      id: 'go',
      name: 'ChatGPT Go',
      tagline: t('Expanded access'),
      price: 8,
      includes: t('Everything in Free, and:'),
      includesIcon: 'sparkle',
      features: [
        t('More messages, including tool calls'),
        t('Higher upload limits'),
        t('Higher image generation limits'),
        t('More voice chats'),
        t('Longer memory'),
      ],
      cta: t('Get Go'),
    },
    {
      id: 'plus',
      name: 'ChatGPT Plus',
      tagline: t('Do more with advanced intelligence'),
      price: 20,
      includes: t('Everything in Go, and:'),
      includesIcon: 'sparkle',
      features: [
        t('Advanced reasoning models, including GPT-6'),
        t('Higher message and upload limits'),
        t('More complex and precise image generation'),
        t('Expanded deep research'),
        t('Expanded memory and context'),
        t('Projects, scheduled tasks, and custom GPTs'),
        t('Higher Codex usage'),
        t('ChatGPT Work on desktop, web, and mobile (higher limits)'),
        t('Early access to new features'),
      ],
      cta: t('Get Plus'),
    },
    {
      id: 'pro',
      name: 'ChatGPT Pro',
      tagline: t('Supercharge your productivity'),
      price: 100,
      priceNote: t('Starting at'),
      includes: t('Everything in Plus, and:'),
      includesIcon: 'gem',
      features: [
        t('3 usage tiers to choose from'),
        t('Pro reasoning powered by GPT-6 Astra'),
        t('Longer sessions in Codex and ChatGPT Work'),
        t('Dot, your always-on agent'),
        t('Unlimited and faster image generation'),
        t('Maximum deep research'),
        t('Maximum memory and context'),
        t('Higher limits for projects, tasks, and custom GPTs'),
        t('Research preview of new features'),
      ],
      cta: t('Get Pro'),
    },
  ]
}
