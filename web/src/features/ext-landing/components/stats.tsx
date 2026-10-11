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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface StatEntry {
  value: string
  suffix?: string
  label: string
}

/** Trust bar under the hero. The figures are marketing placeholders until measured. */
export function Stats() {
  const { t } = useTranslation()
  const stats: StatEntry[] = [
    { value: '200', suffix: '+', label: t('Models available') },
    { value: '99.9', suffix: '%', label: t('Monthly uptime') },
    { value: '7×24', label: t('Technical support') },
    { value: t('Multi-line'), label: t('Direct domestic routes') },
  ]

  return (
    <section
      className='border-border/60 bg-background border-y'
      aria-label={t('Platform figures')}
    >
      <div className='mx-auto grid max-w-6xl grid-cols-2 px-6 md:grid-cols-4'>
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={cn(
              'border-border/60 py-7 pl-4 md:pl-8',
              index % 2 === 1 && 'border-l',
              index > 0 && 'md:border-l',
              index === 0 && 'pl-0 md:pl-0',
              index === 2 && 'pl-0'
            )}
          >
            <div className='text-3xl font-semibold tracking-tight tabular-nums md:text-[34px]'>
              {stat.value}
              {stat.suffix ? (
                <sup className='text-primary ml-0.5 text-base font-medium'>
                  {stat.suffix}
                </sup>
              ) : null}
            </div>
            <div className='text-muted-foreground mt-2 text-sm'>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
