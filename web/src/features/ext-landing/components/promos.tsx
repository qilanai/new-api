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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { CONTAINER_CLASS } from '../constants'
import { SectionHead } from './section-head'

type PromoTone = 'free' | 'limited' | 'hot' | 'info' | 'muted'

interface PromoEntry {
  tone: PromoTone
  badge: string
  title: string
  description: string
  linkLabel: string
  /** Internal route or in-page anchor. */
  to: string
}

const TONE_CLASS: Record<PromoTone, string> = {
  free: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  limited: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  hot: 'bg-orange-500 text-white',
  info: 'bg-primary/10 text-primary',
  muted: 'bg-muted text-muted-foreground',
}

const LINK_CLASS =
  'text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline hover:underline-offset-4'

function PromoLink(props: { to: string; label: string }) {
  const content = (
    <>
      {props.label}
      <ArrowRight className='size-3.5' />
    </>
  )
  if (props.to.startsWith('#')) {
    return (
      <a href={props.to} className={LINK_CLASS}>
        {content}
      </a>
    )
  }
  return (
    <Link to={props.to} className={LINK_CLASS}>
      {content}
    </Link>
  )
}

/** Perks grid. Percentages and quotas are placeholders until operations confirms them. */
export function Promos() {
  const { t } = useTranslation()
  const promos: PromoEntry[] = [
    {
      tone: 'free',
      badge: t('New user'),
      title: t('1M free tokens on sign-up'),
      description: t(
        'No credit card, credited instantly, works with every model.'
      ),
      linkLabel: t('Claim now'),
      to: '/sign-up',
    },
    {
      tone: 'limited',
      badge: t('Limited time'),
      title: t('10% bonus on your first top-up'),
      description: t('Your first payment earns extra quota in proportion.'),
      linkLabel: t('Top up'),
      to: '/wallet',
    },
    {
      tone: 'hot',
      badge: t('Hot'),
      title: t('Earn 10% from referrals'),
      description: t('Ongoing rebates on what your invitees spend.'),
      linkLabel: t('Get your invite link'),
      to: '/profile',
    },
    {
      tone: 'info',
      badge: t('Students'),
      title: t('20% off with an academic email'),
      description: t(
        'Students and teachers get a lasting discount after verification.'
      ),
      linkLabel: t('Apply'),
      to: '#contact',
    },
    {
      tone: 'info',
      badge: t('Yearly'),
      title: t('Yearly plans save 2 months'),
      description: t('Pay for 10 months and use 12 on Plus, Pro and Team.'),
      linkLabel: t('See plans'),
      to: '#plans',
    },
    {
      tone: 'muted',
      badge: t('Enterprise'),
      title: t('Enterprise discounts and invoices'),
      description: t(
        'Volume discounts, VAT invoices, contracts and corporate payment.'
      ),
      linkLabel: t('Contact sales'),
      to: '#contact',
    },
  ]

  return (
    <section id='promos' className='bg-muted/40 py-16 md:py-20'>
      <div className={CONTAINER_CLASS}>
        <SectionHead
          title={t('New-user perks and limited-time offers')}
          subtitle={t(
            'Sign-up, first top-up, referrals and yearly plans all come with a bonus'
          )}
          more={{ label: t('All offers'), to: '/wallet' }}
        />
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {promos.map((promo) => (
            <article
              key={promo.title}
              className='bg-card border-border hover:border-muted-foreground/30 relative flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg'
            >
              <Badge
                className={cn(
                  'absolute top-4 right-4 rounded-md border-0',
                  TONE_CLASS[promo.tone]
                )}
              >
                {promo.badge}
              </Badge>
              <h3 className='pr-16 text-lg leading-snug font-semibold'>
                {promo.title}
              </h3>
              <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                {promo.description}
              </p>
              <div className='mt-auto pt-5'>
                <PromoLink to={promo.to} label={promo.linkLabel} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
