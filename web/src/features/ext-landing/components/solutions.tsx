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

import { CONTAINER_CLASS } from '../constants'
import { useDocsLink } from '../hooks/use-docs-link'
import { SectionHead } from './section-head'

interface SolutionEntry {
  title: string
  description: string
}

const LINK_CLASS =
  'text-primary text-sm font-medium hover:underline hover:underline-offset-4'

export function Solutions() {
  const { t } = useTranslation()
  const docsLink = useDocsLink()
  const solutions: SolutionEntry[] = [
    {
      title: t('AI coding assistants'),
      description: t(
        'Connect Cursor, Claude Code and Cline in one step with a shared team quota and per-seat limits.'
      ),
    },
    {
      title: t('Support bots & knowledge bases'),
      description: t(
        'RAG answers on your website, WeCom and DingTalk, around the clock.'
      ),
    },
    {
      title: t('Content & marketing'),
      description: t(
        'Batch-generate copy, images and short-video scripts and compare models side by side.'
      ),
    },
    {
      title: t('Workplace assistants'),
      description: t(
        'Document summaries, meeting notes and data analysis with permissions per department.'
      ),
    },
    {
      title: t('Education & research'),
      description: t(
        'Academic email discounts and bulk accounts for classrooms and labs with usage caps.'
      ),
    },
  ]

  return (
    <section id='solutions' className='bg-muted/40 py-16 md:py-20'>
      <div className={CONTAINER_CLASS}>
        <SectionHead
          title={t('Ready-made for common scenarios')}
          subtitle={t(
            'Find the answer by use case, each with a setup guide and recommended models'
          )}
          more={{ label: t('All solutions'), href: docsLink }}
        />
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-5'>
          {solutions.map((solution) => (
            <article
              key={solution.title}
              className='bg-card border-border hover:border-muted-foreground/30 flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg'
            >
              <h3 className='text-lg leading-snug font-semibold'>
                {solution.title}
              </h3>
              <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                {solution.description}
              </p>
              <div className='mt-auto flex gap-4 pt-5'>
                <a
                  href={docsLink}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={LINK_CLASS}
                >
                  {t('View solution')}
                </a>
                <a href='#contact' className={LINK_CLASS}>
                  {t('Talk to an advisor')}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
