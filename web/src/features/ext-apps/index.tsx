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
  ArrowUpRight01Icon,
  Globe02Icon,
  PaintBoardIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { cn } from '@/lib/utils'

import { useApplications } from './api'

function ChatPreviewIllustration() {
  return (
    <div
      aria-hidden='true'
      className='from-primary/[0.09] via-chart-2/[0.04] to-muted/30 relative h-40 overflow-hidden border-b bg-linear-to-br select-none'
    >
      <div className='absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_100%)] [background-size:16px_16px] opacity-70' />
      <div className='bg-primary/15 pointer-events-none absolute -top-10 right-1/4 size-36 rounded-full blur-2xl' />

      {/* Left floating prompt mask / model card */}
      <div className='bg-background/95 ring-border/80 absolute top-5 left-[8%] w-36 -rotate-2 rounded-lg p-2.5 shadow-sm ring-1 transition-transform duration-300 group-hover/card:-translate-y-0.5 sm:left-[10%] sm:w-40'>
        <div className='flex items-center gap-1.5'>
          <span className='bg-primary/20 text-primary rounded-xs px-1.5 py-0.5 font-mono text-[9px] font-semibold'>
            MASK
          </span>
          <div className='bg-muted-foreground/25 h-1.5 flex-1 rounded-full' />
        </div>
        <div className='mt-2 space-y-1.5'>
          <div className='bg-muted/80 flex items-center gap-1.5 rounded-xs px-1.5 py-1'>
            <span className='bg-success size-1.5 rounded-full' />
            <div className='bg-foreground/30 h-1.5 w-16 rounded-full' />
          </div>
          <div className='bg-muted/50 flex items-center gap-1.5 rounded-xs px-1.5 py-1'>
            <span className='bg-primary/60 size-1.5 rounded-full' />
            <div className='bg-muted-foreground/25 h-1.5 w-12 rounded-full' />
          </div>
        </div>
      </div>

      {/* Right floating chat thread card */}
      <div className='bg-card/95 ring-primary/25 absolute top-6 right-[8%] w-48 rotate-1 rounded-lg p-2.5 shadow-md ring-1 backdrop-blur-xs transition-transform duration-300 group-hover/card:translate-y-0.5 sm:right-[10%] sm:w-52'>
        <div className='flex flex-col gap-2'>
          <div className='bg-primary text-primary-foreground ml-auto w-3/4 rounded-md rounded-br-xs px-2 py-1.5'>
            <div className='bg-primary-foreground/85 h-1.5 w-full rounded-full' />
          </div>
          <div className='bg-muted/90 mr-auto w-11/12 space-y-1.5 rounded-md rounded-bl-xs p-2'>
            <div className='bg-foreground/35 h-1.5 w-4/5 rounded-full' />
            <div className='bg-foreground/25 h-1.5 w-3/5 rounded-full' />
            <div className='bg-background/80 mt-1 flex items-center justify-between rounded-xs px-1.5 py-1'>
              <span className='text-primary font-mono text-[9px]'>stream</span>
              <span className='bg-primary/40 h-1.5 w-8 rounded-full' />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StudioPreviewIllustration() {
  return (
    <div
      aria-hidden='true'
      className='from-primary/[0.08] via-primary/[0.03] to-muted/30 relative h-40 overflow-hidden border-b bg-linear-to-br select-none'
    >
      <div className='absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_100%)] [background-size:16px_16px] opacity-70' />
      <div className='bg-primary/15 pointer-events-none absolute -top-10 left-1/4 size-36 rounded-full blur-2xl' />

      {/* Left floating image/storyboard card */}
      <div className='bg-background/95 ring-border/80 absolute top-5 left-[10%] w-40 -rotate-3 rounded-lg p-2 shadow-sm ring-1 transition-transform duration-300 group-hover/card:-translate-y-0.5 sm:left-[14%] sm:w-44'>
        <div className='from-primary/20 via-chart-2/15 to-chart-3/20 relative h-20 overflow-hidden rounded-md bg-linear-to-br'>
          <div className='bg-warning/75 absolute top-2.5 right-3 size-4 rounded-full' />
          <div className='bg-primary/25 absolute -bottom-5 -left-2 h-14 w-24 rotate-12 rounded-md' />
          <div className='bg-primary/40 absolute -right-2 -bottom-6 h-16 w-24 -rotate-12 rounded-md' />
          <span className='bg-background/85 text-foreground/80 absolute top-1.5 left-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium backdrop-blur-xs'>
            16:9
          </span>
        </div>
        <div className='mt-2 flex items-center justify-between gap-2 px-0.5'>
          <div className='bg-muted-foreground/25 h-1.5 w-16 rounded-full' />
          <div className='bg-primary/35 h-1.5 w-8 rounded-full' />
        </div>
      </div>

      {/* Right floating video player + multi-track timeline card */}
      <div className='bg-card/95 ring-primary/25 absolute top-7 right-[8%] w-48 rotate-2 rounded-lg p-2.5 shadow-md ring-1 backdrop-blur-xs transition-transform duration-300 group-hover/card:translate-y-0.5 sm:right-[12%] sm:w-52'>
        <div className='bg-foreground/[0.06] dark:bg-foreground/[0.1] relative flex h-14 items-center justify-center rounded-md'>
          <div className='bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full shadow-xs'>
            <span className='ml-0.5 text-[9px] leading-none'>▶</span>
          </div>
          <span className='text-muted-foreground absolute right-2 bottom-1 font-mono text-[9px] tabular-nums'>
            00:12 / 00:30
          </span>
        </div>
        {/* Multi-track timeline bars */}
        <div className='relative mt-2.5 space-y-1.5'>
          <div className='bg-primary/60 absolute -top-0.5 bottom-0 left-[42%] w-px' />
          <div className='flex gap-1'>
            <div className='bg-primary/45 h-2 flex-[1.4] rounded-xs' />
            <div className='bg-primary/75 h-2 flex-1 rounded-xs' />
            <div className='bg-primary/35 h-2 flex-[1.1] rounded-xs' />
          </div>
          <div className='flex gap-1'>
            <div className='bg-chart-2/45 h-1.5 flex-1 rounded-xs' />
            <div className='bg-chart-2/70 h-1.5 flex-[1.8] rounded-xs' />
          </div>
        </div>
      </div>
    </div>
  )
}

function SitesPreviewIllustration() {
  return (
    <div
      aria-hidden='true'
      className='from-muted/60 via-muted/25 to-background relative flex h-40 items-center justify-center overflow-hidden border-b bg-linear-to-br select-none'
    >
      <div className='absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_100%)] [background-size:16px_16px] opacity-60' />

      {/* Browser wireframe mockup */}
      <div className='bg-background/90 ring-border/80 relative w-60 rounded-lg shadow-xs ring-1 sm:w-64'>
        <div className='border-border/70 flex items-center gap-1.5 border-b px-2.5 py-1.5'>
          <span className='bg-muted-foreground/25 size-2 rounded-full' />
          <span className='bg-muted-foreground/25 size-2 rounded-full' />
          <span className='bg-muted-foreground/25 size-2 rounded-full' />
          <div className='bg-muted/80 ml-1.5 h-3 flex-1 rounded-xs' />
        </div>
        <div className='grid grid-cols-3 gap-2 p-2.5'>
          <div className='bg-muted/90 col-span-2 flex flex-col justify-between rounded-sm p-2'>
            <div className='space-y-1'>
              <div className='bg-muted-foreground/30 h-2 w-16 rounded-full' />
              <div className='bg-muted-foreground/20 h-1.5 w-24 rounded-full' />
            </div>
            <div className='bg-muted-foreground/25 mt-3 h-3 w-12 rounded-xs' />
          </div>
          <div className='flex flex-col gap-2'>
            <div className='bg-muted/70 flex-1 rounded-sm' />
            <div className='bg-muted/70 flex-1 rounded-sm' />
          </div>
          <div className='bg-muted/60 col-span-3 h-2.5 w-3/4 rounded-xs' />
        </div>
      </div>
    </div>
  )
}

export function ApplicationCenter() {
  const { t } = useTranslation()
  const applications = useApplications()

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Application Center')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-muted-foreground max-w-2xl text-sm'>
            {t('Explore your creative apps.')}
          </p>
          <p className='text-muted-foreground/80 flex items-center gap-1.5 text-xs'>
            <HugeiconsIcon
              icon={SparklesIcon}
              aria-hidden='true'
              className='text-primary size-3.5 shrink-0'
            />
            <span>
              {t(
                'Models are provided by new-api according to your account permissions.'
              )}
            </span>
          </p>
        </div>

        {applications.isPending && <LoadingState />}
        {applications.isError && (
          <ErrorState onRetry={() => void applications.refetch()} />
        )}
        {applications.isSuccess && applications.data.length === 0 && (
          <EmptyState title={t('No applications available')} />
        )}
        {applications.isSuccess && applications.data.length > 0 && (
          <div
            role='list'
            aria-label={t('Application Center')}
            className='grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3'
          >
            {applications.data.map((app) => {
              const isChat = app.id === 'chat'
              const isStudio = app.id === 'studio'
              const canOpen =
                (isChat || isStudio) &&
                (app.availability === 'available' ||
                  app.availability === 'preview')

              let title = t('Website Builder')
              let category = t('AI Website Creation')
              let description = t(
                'Turn ideas into live websites through conversation, visual editing, and one-click publishing.'
              )
              let tags = [
                t('Conversational Build'),
                t('Visual Editing'),
                t('One-Click Publish'),
              ]
              let footerNote = t('In development')

              if (isChat) {
                title = t('AI Chat')
                category = t('Multi-Model Intelligent Assistant')
                description = t(
                  'Chat with all authorized models in one workspace, featuring prompt masks, multi-session history, and zero-key direct access.'
                )
                tags = [
                  t('Multi-Model Switch'),
                  t('Prompt Masks'),
                  t('Streaming Output'),
                  t('Zero API Key'),
                ]
                footerNote = t('Shared account & quota')
              } else if (isStudio) {
                title = 'Studio'
                category = t('Image & Video Creation')
                description = t(
                  'Generate images, design storyboards on an infinite canvas, and edit multi-track videos in one workspace.'
                )
                tags = [
                  t('Image Generation'),
                  t('Video Creation'),
                  t('Infinite Canvas'),
                  t('Timeline Editing'),
                ]
                footerNote = t('Shared account & quota')
              }

              return (
                <Card
                  key={app.id}
                  role='listitem'
                  data-card-hover={canOpen ? undefined : 'false'}
                  className={cn(
                    'relative flex flex-col gap-0 overflow-hidden rounded-xl py-0 transition-all',
                    canOpen
                      ? 'hover:ring-primary/35 focus-within:ring-primary/50'
                      : 'opacity-90'
                  )}
                >
                  {isChat && <ChatPreviewIllustration />}
                  {isStudio && <StudioPreviewIllustration />}
                  {!isChat && !isStudio && <SitesPreviewIllustration />}

                  <CardHeader className='flex flex-row items-start gap-3.5 px-5 pt-5 pb-3 sm:px-6'>
                    <IconBadge
                      size='lg'
                      tone={canOpen ? 'primary' : 'neutral'}
                      className={cn(
                        'rounded-lg ring-1',
                        canOpen
                          ? 'ring-primary/20'
                          : 'ring-border/60 text-muted-foreground'
                      )}
                    >
                      {isChat ? (
                        <MessageSquare aria-hidden='true' className='size-5' />
                      ) : (
                        <HugeiconsIcon
                          icon={isStudio ? PaintBoardIcon : Globe02Icon}
                          aria-hidden='true'
                          className='size-5'
                        />
                      )}
                    </IconBadge>

                    <div className='flex min-w-0 flex-1 flex-col gap-1'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div className='flex min-w-0 items-baseline gap-2'>
                          <CardTitle className='text-lg font-semibold tracking-tight'>
                            <h3>{title}</h3>
                          </CardTitle>
                          <span className='text-muted-foreground truncate text-xs'>
                            {category}
                          </span>
                        </div>
                        <Badge
                          variant={canOpen ? 'secondary' : 'outline'}
                          className='gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium'
                        >
                          <span
                            aria-hidden='true'
                            className={cn(
                              'size-1.5 rounded-full',
                              canOpen ? 'bg-success' : 'bg-muted-foreground/50'
                            )}
                          />
                          {canOpen ? t('Available') : t('Coming soon')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className='flex flex-1 flex-col justify-between gap-4 px-5 pb-5 sm:px-6'>
                    <CardDescription className='text-muted-foreground text-sm leading-relaxed'>
                      {description}
                    </CardDescription>

                    <div className='flex flex-wrap gap-1.5'>
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant='secondary'
                          className='bg-muted/70 text-muted-foreground border-border/50 rounded-sm px-2 py-0.5 text-xs font-normal'
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className='bg-muted/30 flex items-center justify-between gap-4 border-t px-5 py-3.5 sm:px-6'>
                    <span className='text-muted-foreground truncate text-xs'>
                      {footerNote}
                    </span>
                    {isChat && canOpen && (
                      <Button
                        size='default'
                        className='translate-none! rounded-md px-3.5 after:absolute after:inset-0 sm:gap-2'
                        role='link'
                        render={<Link to='/apps/chat' />}
                      >
                        {t('Open Chat')}
                        <HugeiconsIcon
                          icon={ArrowUpRight01Icon}
                          aria-hidden='true'
                          data-icon='inline-end'
                        />
                      </Button>
                    )}
                    {isStudio && canOpen && (
                      <Button
                        size='default'
                        className='translate-none! rounded-md px-3.5 after:absolute after:inset-0 sm:gap-2'
                        title={t('Open in new tab')}
                        role='link'
                        render={
                          <Link
                            to='/apps/studio'
                            reloadDocument
                            target='_blank'
                            rel='noopener noreferrer'
                          />
                        }
                      >
                        {t('Open Studio')}
                        <HugeiconsIcon
                          icon={ArrowUpRight01Icon}
                          aria-hidden='true'
                          data-icon='inline-end'
                        />
                      </Button>
                    )}
                    {!canOpen && (
                      <Button
                        variant='outline'
                        size='default'
                        disabled
                        className='rounded-md px-3.5 sm:gap-2'
                      >
                        {t('Open')}
                        <HugeiconsIcon
                          icon={ArrowUpRight01Icon}
                          aria-hidden='true'
                          data-icon='inline-end'
                        />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
