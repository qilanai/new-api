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
import { Check, ChevronRight, Gem, Sparkle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { CONTAINER_CLASS } from '../constants'
import { buildPlans, type Plan } from '../lib/plans'
import { SectionHead } from './section-head'

function PlanCard(props: { plan: Plan }) {
  const { t } = useTranslation()
  const plan = props.plan
  const IncludesIcon = plan.includesIcon === 'gem' ? Gem : Sparkle

  return (
    <article
      data-testid='plan-card'
      className='bg-card border-border flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg'
    >
      <h3 className='text-2xl font-semibold tracking-tight'>{plan.name}</h3>
      <p className='text-muted-foreground mt-1 text-[15px]'>{plan.tagline}</p>

      <p className='text-muted-foreground mt-8 min-h-5 text-sm'>
        {plan.priceNote}
      </p>
      <div className='mt-1 flex items-baseline gap-1.5 tabular-nums'>
        <span className='text-[40px] leading-none font-semibold tracking-tight'>
          US${plan.price}
        </span>
        <span className='text-muted-foreground text-sm'>{t('/ month')}</span>
      </div>

      <Button
        className='mt-6 h-11 w-full rounded-full text-sm font-medium'
        render={<Link to='/wallet' />}
      >
        {plan.cta}
        <ChevronRight className='size-4' />
      </Button>

      <p className='mt-6 flex items-center gap-2.5 text-sm font-semibold'>
        <IncludesIcon aria-hidden className='size-4 shrink-0' />
        {plan.includes}
      </p>
      <ul className='border-border mt-4 grid gap-3 border-t pt-4 text-sm'>
        {plan.features.map((feature) => (
          <li key={feature} className='flex items-start gap-2.5'>
            <Check
              aria-hidden
              className='text-primary mt-0.5 size-4 shrink-0'
            />
            {feature}
          </li>
        ))}
      </ul>
    </article>
  )
}

/** ChatGPT Go / Plus / Pro with monthly USD pricing. */
export function Plans() {
  const { t } = useTranslation()
  const plans = buildPlans(t)

  return (
    <section id='plans' className='bg-primary/[0.03] py-16 md:py-20'>
      <div className={CONTAINER_CLASS}>
        <SectionHead title={t('Upgrade your plan')} />
        <div className='grid gap-4 md:grid-cols-3'>
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  )
}
