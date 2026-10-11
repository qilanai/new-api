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

import { getLobeIcon } from '@/lib/lobe-icon'

import { CLIENT_APPS, CONTAINER_CLASS, type ClientApp } from '../constants'
import { useDocsLink } from '../hooks/use-docs-link'
import { SectionHead } from './section-head'

function ClientChip(props: { app: ClientApp; hidden?: boolean }) {
  const { t } = useTranslation()
  const app = props.app
  const label =
    app.name === 'Immersive Translate' ? t('Immersive Translate') : app.name

  return (
    <span
      aria-hidden={props.hidden ? true : undefined}
      className='bg-card border-border inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl border pr-5 pl-4 text-[15px] font-medium whitespace-nowrap'
    >
      {app.image ? (
        <img
          src={app.image}
          alt=''
          width={20}
          height={20}
          loading='lazy'
          className='size-5 shrink-0 object-contain'
        />
      ) : (
        <span className='grid size-5 shrink-0 place-items-center'>
          {getLobeIcon(app.icon, 20)}
        </span>
      )}
      {label}
    </span>
  )
}

/** Logo wall of clients that work with an OpenAI-compatible endpoint. */
export function Ecosystem() {
  const { t } = useTranslation()
  const docsLink = useDocsLink()

  return (
    <section id='ecosystem' className='py-16 md:py-20'>
      <div className={CONTAINER_CLASS}>
        <SectionHead
          title={t('Your favourite tools, one-step setup')}
          subtitle={t(
            'Paste the API address and key and you are done; every client has a setup guide'
          )}
          more={{ label: t('Setup guides'), href: docsLink }}
        />
        <div
          className='ext-landing-marquee-container overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]'
          aria-label={t('Supported clients')}
        >
          <div className='ext-landing-marquee flex w-max gap-3'>
            {CLIENT_APPS.map((app) => (
              <ClientChip key={app.name} app={app} />
            ))}
            {CLIENT_APPS.map((app) => (
              <ClientChip key={`${app.name}-copy`} app={app} hidden />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
