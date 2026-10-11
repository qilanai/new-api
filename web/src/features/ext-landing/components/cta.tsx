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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { CONTAINER_CLASS, SALES_EMAIL } from '../constants'

interface CtaProps {
  isAuthenticated: boolean
}

const CTA_TINT = [
  'radial-gradient(60% 120% at 0% 50%, rgba(0, 196, 239, 0.1) 0%, transparent 70%)',
  'radial-gradient(60% 120% at 100% 50%, rgba(230, 0, 198, 0.07) 0%, transparent 70%)',
].join(', ')

/** Closing call to action on a light tinted band; the `contact` anchor lands here. */
export function Cta(props: CtaProps) {
  const { t } = useTranslation()

  return (
    <section
      id='contact'
      className='border-border/60 bg-background border-t py-16 md:py-20'
      style={{ backgroundImage: CTA_TINT }}
    >
      <div
        className={`${CONTAINER_CLASS} flex flex-col gap-8 md:flex-row md:items-center md:justify-between`}
      >
        <div className='min-w-0'>
          <h2 className='text-[26px] font-semibold tracking-tight text-balance md:text-3xl'>
            {t('Start now and claim 1M free tokens')}
          </h2>
          <p className='text-muted-foreground mt-2.5 text-[15px]'>
            {t(
              'Credited on sign-up, no credit card; enterprise customers can contact sales for a tailored plan.'
            )}
          </p>
        </div>
        <div className='flex shrink-0 flex-wrap gap-3'>
          {props.isAuthenticated ? (
            <Button
              className='h-11 rounded-lg px-6'
              render={<Link to='/dashboard' />}
            >
              {t('Go to Dashboard')}
            </Button>
          ) : (
            <Button
              className='h-11 rounded-lg px-6'
              render={<Link to='/sign-up' />}
            >
              {t('Sign up for free')}
            </Button>
          )}
          <Button
            variant='outline'
            className='border-primary text-primary hover:bg-primary/5 h-11 rounded-lg px-6'
            render={<a href={`mailto:${SALES_EMAIL}`} />}
          >
            {t('Contact sales')}
          </Button>
        </div>
      </div>
    </section>
  )
}
