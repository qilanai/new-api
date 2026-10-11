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
  BookOpen,
  Headset,
  ListChecks,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CONTAINER_CLASS } from '../constants'

interface ServiceEntry {
  icon: LucideIcon
  title: string
  description: string
}

export function Service() {
  const { t } = useTranslation()
  const items: ServiceEntry[] = [
    {
      icon: Headset,
      title: t('24/7 technical support'),
      description: t(
        'Tickets and live chat around the clock; nothing waits overnight.'
      ),
    },
    {
      icon: UserRound,
      title: t('Dedicated account manager'),
      description: t('Team and Enterprise plans get a named advisor.'),
    },
    {
      icon: BookOpen,
      title: t('Docs and SDK samples'),
      description: t(
        'Samples for every major language, client setup guides and an FAQ.'
      ),
    },
    {
      icon: ListChecks,
      title: t('Traceable logs and bills'),
      description: t(
        'Model, tokens and cost recorded for every call and exportable for reconciliation.'
      ),
    },
  ]

  return (
    <section className='bg-muted/40 py-14 md:py-16' aria-label={t('Service')}>
      <div className={CONTAINER_CLASS}>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {items.map((item) => (
            <div
              key={item.title}
              className='grid grid-cols-[44px_minmax(0,1fr)] items-start gap-4'
            >
              <div className='bg-primary/10 text-primary grid size-11 place-items-center rounded-xl'>
                <item.icon aria-hidden className='size-[22px]' />
              </div>
              <div>
                <div className='text-base font-semibold'>{item.title}</div>
                <p className='text-muted-foreground mt-1 text-[13px] leading-relaxed'>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
