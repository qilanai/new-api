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
import { FolderOpen, HardDrive, UploadCloud, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Progress } from '@/components/ui/progress'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  formatAssetSize,
  getAssetVisual,
  type Listing,
} from '../lib/asset-utils'

type AssetOverviewProps = {
  file: File | null
  isUploading: boolean
  listing: Listing | undefined
  onSelectFile: (file: File | null) => void
  onUpload: (file: File) => void
}

export function AssetOverview(props: AssetOverviewProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const selectedVisual = props.file
    ? getAssetVisual(props.file.type || 'application/octet-stream')
    : null
  const SelectedIcon = selectedVisual?.icon ?? UploadCloud

  const usedBytes = props.listing?.used_bytes ?? 0
  const quotaBytes = props.listing?.quota_bytes ?? 0
  const rawPercent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0
  const usagePercent = Math.min(100, Math.max(0, rawPercent))
  let usageBadgeVariant: 'secondary' | 'warning' | 'destructive' = 'secondary'
  if (usagePercent >= 90) {
    usageBadgeVariant = 'destructive'
  } else if (usagePercent >= 75) {
    usageBadgeVariant = 'warning'
  }

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-12'>
      <Card
        size='sm'
        className={cn(
          'justify-center border-dashed transition-colors lg:col-span-7',
          isDragActive
            ? 'border-primary bg-primary/5 ring-primary/30'
            : 'bg-card/60 hover:bg-muted/20'
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragActive(false)
          const dropped = event.dataTransfer.files?.[0] ?? null
          if (dropped) {
            props.onSelectFile(dropped)
          }
        }}
      >
        <CardContent className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex min-w-0 items-center gap-3'>
            <IconBadge
              tone={selectedVisual ? selectedVisual.tone : 'primary'}
              size='lg'
              className='rounded-xl ring-1 ring-current/15'
            >
              <SelectedIcon aria-hidden='true' className='size-5' />
            </IconBadge>
            <div className='min-w-0 flex-1'>
              {props.file ? (
                <>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='truncate text-sm font-medium'>
                      {props.file.name}
                    </span>
                    <Badge
                      variant='secondary'
                      className='font-mono text-[11px] font-normal'
                    >
                      {props.file.type || 'application/octet-stream'}
                    </Badge>
                  </div>
                  <p className='text-muted-foreground mt-0.5 text-xs tabular-nums'>
                    {formatAssetSize(props.file.size, locale)}
                  </p>
                </>
              ) : (
                <>
                  <p className='text-sm font-medium'>{t('Upload file')}</p>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    {t('Image')} · {t('Audio')} · {t('Video')} · {t('Other')}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className='flex shrink-0 flex-wrap items-center gap-2'>
            <label htmlFor='ext-asset-upload-input' className='sr-only'>
              {t('File')}
            </label>
            <input
              ref={inputRef}
              id='ext-asset-upload-input'
              type='file'
              className='sr-only'
              onChange={(event) => {
                props.onSelectFile(event.target.files?.[0] ?? null)
                event.target.value = ''
              }}
            />
            {props.file && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                disabled={props.isUploading}
                onClick={() => props.onSelectFile(null)}
              >
                <X aria-hidden='true' className='size-3.5' />
                {t('Remove')}
              </Button>
            )}
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={props.isUploading}
              onClick={() => inputRef.current?.click()}
            >
              <FolderOpen aria-hidden='true' className='size-3.5' />
              {props.file ? t('Choose another file') : t('Choose file')}
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={!props.file || props.isUploading}
              onClick={() => {
                if (props.file) {
                  props.onUpload(props.file)
                }
              }}
            >
              <UploadCloud aria-hidden='true' className='size-3.5' />
              {props.isUploading ? t('Uploading...') : t('Upload')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card size='sm' className='justify-center lg:col-span-5'>
        <CardContent className='space-y-2.5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2.5'>
              <IconBadge tone='primary' size='md' className='rounded-lg'>
                <HardDrive aria-hidden='true' className='size-4' />
              </IconBadge>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium'>{t('Storage')}</span>
                  {props.listing && (
                    <Badge
                      variant='outline'
                      className='text-[11px] font-normal'
                    >
                      {t('Total {{count}} records', {
                        count: props.listing.total,
                      })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {props.listing && (
              <div className='flex items-center gap-2 text-xs'>
                <span className='text-muted-foreground font-medium tabular-nums'>
                  {formatAssetSize(props.listing.used_bytes, locale)} /{' '}
                  {formatAssetSize(props.listing.quota_bytes, locale)}
                </span>
                <Badge
                  variant={usageBadgeVariant}
                  className='font-mono text-[11px] tabular-nums'
                >
                  {formatNumber(Math.round(usagePercent), locale)}%
                </Badge>
              </div>
            )}
          </div>
          {props.listing && (
            <Progress
              aria-label={t('Storage')}
              value={usagePercent}
              className='[&_[data-slot=progress-track]]:h-2'
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
