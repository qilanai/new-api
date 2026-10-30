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
  Check,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TimestampCell } from '@/components/activity-time-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { toIntlLocale } from '@/i18n/languages'
import { cn } from '@/lib/utils'

import { formatAssetSize, getAssetVisual, type Asset } from '../lib/asset-utils'

type AssetCardProps = {
  asset: Asset
  isChecked: boolean
  isEditing: boolean
  editingName: string
  isSavingName: boolean
  onCheckedChange: (checked: boolean) => void
  onEditingNameChange: (value: string) => void
  onStartEdit: (asset: Asset) => void
  onCancelEdit: () => void
  onSaveEdit: (asset: Asset) => void
  onPreview: (asset: Asset) => void
  onDownload: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

export function AssetCard(props: AssetCardProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null)
  const visual = getAssetVisual(props.asset.content_type)
  const AssetIcon = visual.icon
  const previewUrl = props.asset.preview_url
  const showDirectPreview =
    Boolean(previewUrl) &&
    failedPreviewUrl !== previewUrl &&
    (visual.mediaType === 'image' || visual.mediaType === 'video')

  return (
    <li
      className={cn(
        'group bg-card relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200',
        props.isChecked
          ? 'border-primary ring-primary/20 bg-primary/[0.02] ring-2'
          : 'hover:border-foreground/20 hover:shadow-sm'
      )}
    >
      <div className='bg-muted/35 relative aspect-square w-full overflow-hidden border-b'>
        {showDirectPreview && visual.mediaType === 'image' && (
          <img
            src={previewUrl}
            alt={props.asset.name}
            loading='lazy'
            onError={() => {
              if (previewUrl) {
                setFailedPreviewUrl(previewUrl)
              }
            }}
            className='size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
          />
        )}

        {showDirectPreview && visual.mediaType === 'video' && (
          <>
            <video
              src={previewUrl}
              preload='metadata'
              muted
              playsInline
              onError={() => {
                if (previewUrl) {
                  setFailedPreviewUrl(previewUrl)
                }
              }}
              onMouseEnter={(event) => {
                void event.currentTarget.play().catch(() => undefined)
              }}
              onMouseLeave={(event) => {
                event.currentTarget.pause()
                event.currentTarget.currentTime = 0
              }}
              className='size-full object-cover'
            />
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25'>
              <span className='bg-background/85 text-foreground flex size-11 items-center justify-center rounded-full shadow-md ring-1 ring-black/10 backdrop-blur-md dark:ring-white/15'>
                <Play
                  aria-hidden='true'
                  className='ml-0.5 size-5 fill-current'
                />
              </span>
            </div>
          </>
        )}

        {!showDirectPreview && (
          <div className='flex size-full flex-col items-center justify-center gap-2.5 p-4'>
            <IconBadge
              tone={visual.tone}
              size='lg'
              className='size-14 rounded-2xl ring-1 ring-current/15'
            >
              <AssetIcon aria-hidden='true' className='size-7' />
            </IconBadge>
            <Badge
              variant='secondary'
              className='font-mono text-[11px] font-medium tracking-wider'
            >
              {visual.formatLabel}
            </Badge>
          </div>
        )}

        {visual.canPreview && (
          <button
            type='button'
            aria-label={`${t('Preview')} ${props.asset.name}`}
            onClick={() => props.onPreview(props.asset)}
            className='focus-visible:ring-ring absolute inset-0 z-[1] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset'
          />
        )}

        <div className='pointer-events-none absolute inset-x-2.5 top-2.5 z-10 flex items-center justify-between gap-2'>
          <div className='pointer-events-auto flex items-center gap-1.5'>
            <div className='bg-background/90 flex size-7 items-center justify-center rounded-lg shadow-xs ring-1 ring-black/10 backdrop-blur-md dark:ring-white/15'>
              <Checkbox
                aria-label={`${t('Select')} ${props.asset.name}`}
                checked={props.isChecked}
                onCheckedChange={props.onCheckedChange}
              />
            </div>
            <Badge
              variant='secondary'
              className='bg-background/90 text-foreground h-7 gap-1 rounded-lg px-2 text-xs font-medium shadow-xs ring-1 ring-black/10 backdrop-blur-md dark:ring-white/15'
            >
              <AssetIcon aria-hidden='true' className='size-3.5' />
              <span>{t(visual.labelKey)}</span>
            </Badge>
          </div>

          <div className='pointer-events-auto'>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                render={
                  <Button
                    type='button'
                    variant='secondary'
                    size='icon-sm'
                    aria-label={t('Open menu')}
                    className='bg-background/90 hover:bg-background text-foreground data-popup-open:bg-background size-7 rounded-lg shadow-xs ring-1 ring-black/10 backdrop-blur-md dark:ring-white/15'
                  />
                }
              >
                <MoreHorizontal aria-hidden='true' className='size-4' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-40'>
                {visual.canPreview && (
                  <DropdownMenuItem
                    onClick={() => props.onPreview(props.asset)}
                  >
                    <Eye aria-hidden='true' className='size-4' />
                    {t('Preview')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => props.onStartEdit(props.asset)}
                >
                  <Pencil aria-hidden='true' className='size-4' />
                  {t('Edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => props.onDownload(props.asset)}>
                  <Download aria-hidden='true' className='size-4' />
                  {t('Download')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant='destructive'
                  onClick={() => props.onDelete(props.asset)}
                >
                  <Trash2 aria-hidden='true' className='size-4' />
                  {t('Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className='flex flex-1 flex-col justify-between gap-2 p-3'>
        {props.isEditing ? (
          <div className='space-y-2'>
            <Input
              aria-label={t('Name')}
              value={props.editingName}
              onChange={(event) =>
                props.onEditingNameChange(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' && props.editingName.trim()) {
                  props.onSaveEdit(props.asset)
                }
                if (event.key === 'Escape') {
                  props.onCancelEdit()
                }
              }}
              className='h-8 text-xs'
            />
            <div className='flex items-center justify-end gap-1.5'>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={props.onCancelEdit}
              >
                <X aria-hidden='true' className='size-3' />
                {t('Cancel')}
              </Button>
              <Button
                type='button'
                size='xs'
                disabled={!props.editingName.trim() || props.isSavingName}
                onClick={() => props.onSaveEdit(props.asset)}
              >
                <Check aria-hidden='true' className='size-3' />
                {t('Save')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className='flex items-start justify-between gap-2'>
              <span
                title={props.asset.name}
                className='line-clamp-1 min-w-0 text-sm font-medium break-all'
              >
                {props.asset.name}
              </span>
              <Badge
                variant='outline'
                className='shrink-0 font-mono text-[10px] font-normal uppercase'
              >
                {visual.formatLabel}
              </Badge>
            </div>
            <div className='text-muted-foreground flex items-center justify-between gap-2 text-xs'>
              <span className='font-medium tabular-nums'>
                {formatAssetSize(props.asset.size_bytes, locale)}
              </span>
              {props.asset.created_at ? (
                <TimestampCell
                  timestamp={props.asset.created_at}
                  locale={locale}
                  justNowLabel={t('Just now')}
                  className='text-muted-foreground inline text-xs'
                />
              ) : (
                <span>{props.asset.content_type}</span>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  )
}
