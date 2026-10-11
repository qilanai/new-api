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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { CONTAINER_CLASS } from '../constants'
import {
  buildModelCards,
  buildModelTabs,
  type ModelCard,
  type ModelCategory,
} from '../lib/catalog'
import { SectionHead } from './section-head'

const TAB_CLASS =
  'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground h-9 rounded-full border px-4 text-sm data-selected:border-primary data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-none'

function ModelCardView(props: { card: ModelCard }) {
  const { t } = useTranslation()
  const card = props.card

  return (
    <article
      data-testid='model-card'
      className='bg-card border-border hover:border-muted-foreground/30 relative flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg'
    >
      {card.badge ? (
        <Badge
          className={cn(
            'absolute top-4 right-4 rounded-md border-0 text-white',
            card.badge === 'hot'
              ? 'bg-orange-500'
              : 'bg-gradient-to-r from-blue-500 to-violet-500'
          )}
        >
          {card.badge === 'hot' ? t('Hot') : t('New')}
        </Badge>
      ) : null}
      <div className='text-muted-foreground text-xs'>{card.vendor}</div>
      <h3 className='mt-1.5 text-lg leading-snug font-semibold'>{card.name}</h3>
      <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
        {card.description}
      </p>
      <div className='mt-auto flex items-end justify-between gap-3 pt-5'>
        <div className='text-muted-foreground text-xs'>
          {card.priceLabel}
          <b className='block text-[15px] font-semibold text-orange-600 dark:text-orange-400'>
            {t('Official price')}
          </b>
        </div>
        <Button
          variant='outline'
          className='border-primary text-primary hover:bg-primary/5 rounded-lg'
          render={<Link to='/pricing' />}
        >
          {t('Call now')}
        </Button>
      </div>
    </article>
  )
}

/** Model plaza: vendor tabs over a card grid. */
export function Models() {
  const { t } = useTranslation()
  const [category, setCategory] = useState<ModelCategory>('all')
  const tabs = buildModelTabs(t)
  const cards = buildModelCards(t).filter((card) =>
    card.categories.includes(category)
  )

  return (
    <section id='models' className='py-16 md:py-20'>
      <div className={CONTAINER_CLASS}>
        <SectionHead
          title={t('Leading models, one integration')}
          subtitle={t(
            'Pick by vendor, transparent pricing, new releases synced with the vendors'
          )}
          more={{ label: t('All models & pricing'), to: '/pricing' }}
        />
        <Tabs
          value={category}
          onValueChange={(value) => setCategory(value as ModelCategory)}
          className='mb-6'
        >
          <TabsList
            variant='line'
            aria-label={t('Model categories')}
            className='h-auto flex-wrap justify-start gap-2 p-0'
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={TAB_CLASS}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {cards.map((card) => (
            <ModelCardView key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  )
}
