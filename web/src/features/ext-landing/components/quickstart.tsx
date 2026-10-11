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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { CONTAINER_CLASS } from '../constants'
import { useDocsLink } from '../hooks/use-docs-link'
import {
  buildCodeSamples,
  resolveBaseUrl,
  type SampleLanguage,
} from '../lib/code-samples'
import { SectionHead } from './section-head'

const CODE_TAB_CLASS =
  'h-8 rounded-md px-3 text-[13px] text-[#aeb4cf] hover:text-white data-selected:bg-white/10 data-selected:text-white data-selected:shadow-none'

export function QuickStart() {
  const { t } = useTranslation()
  const docsLink = useDocsLink()
  const baseUrl = useMemo(resolveBaseUrl, [])
  const samples = useMemo(() => buildCodeSamples(baseUrl), [baseUrl])
  const [language, setLanguage] = useState<SampleLanguage>('python')
  const current =
    samples.find((sample) => sample.value === language) ?? samples[0]

  const steps = [
    {
      title: t('Sign up and create an API key'),
      description: t(
        'Open Tokens in the console and create a key; you can limit it by model and quota.'
      ),
    },
    {
      title: t('Point base_url at Elink Nexus'),
      description: (
        <>
          {t('Base URL')}:{' '}
          <code className='bg-muted rounded px-1.5 py-0.5 font-mono text-[13px]'>
            {baseUrl}
          </code>
          . {t('Every other parameter matches OpenAI.')}
        </>
      ),
    },
    {
      title: t('Start calling'),
      description: t(
        'Put any live model name in model; streaming and tool calls are supported.'
      ),
    },
  ]

  return (
    <section id='quickstart' className='py-16 md:py-20'>
      <div className={CONTAINER_CLASS}>
        <SectionHead
          title={t('Three steps, live in 5 minutes')}
          subtitle={t('Call it like OpenAI; only the address changes')}
          more={{ label: t('Full documentation'), href: docsLink }}
        />
        <div className='grid items-start gap-10 lg:grid-cols-12'>
          <ol className='lg:col-span-5'>
            {steps.map((step, index) => (
              <li
                key={step.title}
                className='relative grid grid-cols-[36px_minmax(0,1fr)] gap-4 pb-7 last:pb-0'
              >
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className='bg-border absolute top-9 bottom-0 left-[17px] w-0.5'
                  />
                ) : null}
                <span className='bg-primary text-primary-foreground grid size-9 place-items-center rounded-full text-[15px] font-semibold'>
                  {index + 1}
                </span>
                <div className='min-w-0'>
                  <div className='text-[17px] leading-9 font-semibold'>
                    {step.title}
                  </div>
                  <p className='text-muted-foreground text-sm leading-relaxed'>
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className='min-w-0 overflow-hidden rounded-2xl bg-[#121a33] text-[#e6e9f4] lg:col-span-7'>
            <div className='flex items-center justify-between gap-3 border-b border-white/10 p-2 pr-3'>
              <Tabs
                value={language}
                onValueChange={(value) => setLanguage(value as SampleLanguage)}
              >
                <TabsList
                  variant='line'
                  aria-label={t('Sample language')}
                  className='h-auto gap-1 p-0'
                >
                  {samples.map((sample) => (
                    <TabsTrigger
                      key={sample.value}
                      value={sample.value}
                      className={CODE_TAB_CLASS}
                    >
                      {sample.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <CopyButton
                value={current.code}
                variant='ghost'
                className='text-[#aeb4cf] hover:bg-white/10 hover:text-white'
              />
            </div>
            <pre className='overflow-x-auto p-5 font-mono text-[13px] leading-relaxed'>
              <code>{current.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
