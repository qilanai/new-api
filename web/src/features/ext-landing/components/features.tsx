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
import {
  Link2,
  Lock,
  Receipt,
  ShieldCheck,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CONTAINER_CLASS } from '../constants'
import { SectionHead } from './section-head'

interface FeatureEntry {
  icon: LucideIcon
  title: string
  description: string
}

export function Features() {
  const { t } = useTranslation()
  const features: FeatureEntry[] = [
    {
      icon: Link2,
      title: t('Unified API'),
      description: t(
        'OpenAI, Anthropic and Gemini protocols behind one endpoint; change base_url and keep your code.'
      ),
    },
    {
      icon: Receipt,
      title: t('Transparent billing'),
      description: t(
        'Pay per token in real time, every call itemised, input and output priced separately, export any time.'
      ),
    },
    {
      icon: ShieldCheck,
      title: t('High availability'),
      description: t(
        'Automatic failover across upstreams; a failing channel is switched out in seconds.'
      ),
    },
    {
      icon: Zap,
      title: t('Low latency'),
      description: t(
        'Direct domestic routes for faster first tokens on streaming and smooth long chats.'
      ),
    },
    {
      icon: Lock,
      title: t('Secure by default'),
      description: t(
        'Separate keys, quota caps, IP and model allowlists, auditable call logs.'
      ),
    },
    {
      icon: Users,
      title: t('Team management'),
      description: t(
        'Per-key group limits, usage reports and one bill, so team usage stays accountable.'
      ),
    },
  ]

  return (
    <section id='features' className='py-16 md:py-20'>
      <div className={CONTAINER_CLASS}>
        <SectionHead
          title={t('Why Elink Nexus')}
          subtitle={t(
            'We handle integration, billing and reliability so you just call the API'
          )}
        />
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {features.map((feature) => (
            <article
              key={feature.title}
              className='bg-card border-border hover:border-muted-foreground/30 rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg'
            >
              <div className='bg-primary/10 text-primary mb-4 grid size-11 place-items-center rounded-xl'>
                <feature.icon aria-hidden className='size-[22px]' />
              </div>
              <h3 className='text-lg font-semibold'>{feature.title}</h3>
              <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
