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
import { ArrowRight, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { buildQuickModels } from '../lib/catalog'

interface HeroProps {
  isAuthenticated: boolean
}

const HERO_GLOW = [
  'radial-gradient(55% 75% at 6% 0%, rgba(0, 196, 239, 0.38) 0%, transparent 62%)',
  'radial-gradient(45% 65% at 100% 0%, rgba(230, 0, 198, 0.2) 0%, transparent 62%)',
  'radial-gradient(60% 55% at 50% 115%, rgba(19, 102, 236, 0.16) 0%, transparent 62%)',
].join(', ')

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const quickModels = buildQuickModels(t)
  const trust = [
    t('OpenAI SDK compatible'),
    t('No credit card required'),
    t('Sign up and get 1M free tokens'),
  ]

  return (
    <section className='relative isolate overflow-hidden px-6 pt-28 pb-16 md:pt-36 md:pb-20'>
      <div
        aria-hidden
        className='via-background absolute inset-0 -z-10 bg-gradient-to-br from-sky-100 to-fuchsia-50 dark:from-sky-950/40 dark:to-fuchsia-950/30'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 dark:opacity-40'
        style={{ backgroundImage: HERO_GLOW }}
      />

      <div className='mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10'>
        <div className='lg:col-span-7'>
          <div className='border-primary/25 bg-background text-primary inline-flex h-7 items-center gap-2 rounded-full border pr-3 pl-1.5 text-xs'>
            <Badge className='h-[18px] border-0 bg-gradient-to-r from-blue-500 to-violet-500 text-white'>
              {t('New')}
            </Badge>
            <span>{t('Latest flagship models are live')}</span>
          </div>

          {/* Two block lines instead of <br/>: an inline bg-clip-text span can overlap
              the line above in Firefox and clip its glyphs; the first line is also
              lifted above the gradient line in paint order. The gradient line stays
              inline-block so the gradient spans the text, not the whole column. */}
          <h1 className='mt-5 text-[clamp(2rem,4.2vw,3rem)] leading-[1.2] font-semibold tracking-tight text-balance'>
            <span className='relative z-10 block'>{t('One API,')}</span>
            <span className='inline-block bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 bg-clip-text pb-[0.06em] text-transparent'>
              {t('all leading AI models')}
            </span>
          </h1>
          <p className='text-muted-foreground mt-5 max-w-xl text-[17px] leading-relaxed'>
            {t(
              'OpenAI, Anthropic, Google, DeepSeek, Qwen and more behind one endpoint with one bill. Pay per token and start right after sign-up.'
            )}
          </p>

          <div className='mt-8 flex flex-wrap gap-3'>
            {props.isAuthenticated ? (
              <Button
                className='group h-11 rounded-lg px-6 text-sm font-medium'
                render={<Link to='/dashboard' />}
              >
                {t('Go to Dashboard')}
                <ArrowRight className='size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
              </Button>
            ) : (
              <Button
                className='group h-11 rounded-lg px-6 text-sm font-medium'
                render={<Link to='/sign-up' />}
              >
                {t('Start for free')}
                <ArrowRight className='size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
              </Button>
            )}
            <Button
              variant='outline'
              className='border-primary text-primary hover:bg-primary/5 h-11 rounded-lg px-6 text-sm font-medium'
              render={<Link to='/pricing' />}
            >
              {t('Models & pricing')}
            </Button>
          </div>

          <ul className='text-muted-foreground mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px]'>
            {trust.map((item) => (
              <li key={item} className='inline-flex items-center gap-1.5'>
                <Check
                  aria-hidden
                  className='size-3.5 text-emerald-600 dark:text-emerald-400'
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <aside
          className='bg-card border-border rounded-3xl border p-2 shadow-[0_16px_48px_rgba(19,102,236,0.12)] lg:col-span-5'
          aria-label={t('Popular models')}
        >
          <div className='text-muted-foreground flex items-center justify-between px-4 pt-3 pb-2 text-[13px]'>
            <span>{t('Popular models')}</span>
            <Link
              to='/pricing'
              className='text-primary inline-flex items-center gap-1 hover:underline hover:underline-offset-4'
            >
              {t('All models')}
              <ArrowRight className='size-3.5' />
            </Link>
          </div>
          {quickModels.map((model) => (
            <Link
              key={model.id}
              to='/pricing'
              className='hover:bg-muted/60 group grid grid-cols-[72px_minmax(0,1fr)_16px] items-center gap-3 rounded-xl px-4 py-3 transition-colors'
            >
              <span className='text-muted-foreground text-xs'>
                {model.category}
              </span>
              <span className='min-w-0'>
                <span className='block text-[15px] font-medium'>
                  {model.name}
                </span>
                <span className='text-muted-foreground mt-0.5 block text-xs'>
                  {model.description}
                </span>
              </span>
              <ArrowRight className='text-muted-foreground group-hover:text-primary size-4' />
            </Link>
          ))}
        </aside>
      </div>
    </section>
  )
}
