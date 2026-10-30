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
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { toIntlLocale } from '@/i18n/languages'

import { formatAssetSize, getAssetVisual, type Asset } from '../lib/asset-utils'

export type PreviewState = {
  asset: Asset
  url: string
}

type AssetPreviewDialogProps = {
  preview: PreviewState | null
  onClose: () => void
  onDownload: (asset: Asset) => void
}

export function AssetPreviewDialog(props: AssetPreviewDialogProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const visual = props.preview
    ? getAssetVisual(props.preview.asset.content_type)
    : null

  return (
    <Dialog
      open={props.preview !== null}
      onOpenChange={(open) => {
        if (!open) {
          props.onClose()
        }
      }}
      title={props.preview?.asset.name ?? t('Preview')}
      description={
        props.preview && visual
          ? `${t(visual.labelKey)} · ${formatAssetSize(props.preview.asset.size_bytes, locale)} · ${props.preview.asset.content_type}`
          : undefined
      }
      contentClassName='sm:max-w-2xl'
      footer={
        <>
          <Button type='button' variant='outline' onClick={props.onClose}>
            {t('Close')}
          </Button>
          {props.preview && (
            <Button
              type='button'
              onClick={() => {
                if (props.preview) {
                  props.onDownload(props.preview.asset)
                }
              }}
            >
              <Download aria-hidden='true' className='size-4' />
              {t('Download')}
            </Button>
          )}
        </>
      }
    >
      {props.preview && visual && (
        <div className='bg-muted/30 flex max-h-[65vh] min-h-48 items-center justify-center overflow-hidden rounded-xl border p-3'>
          {visual.mediaType === 'video' && (
            <video
              src={props.preview.url}
              controls
              autoPlay
              playsInline
              className='max-h-[60vh] max-w-full rounded-lg'
            />
          )}
          {visual.mediaType === 'audio' && (
            <audio
              src={props.preview.url}
              controls
              autoPlay
              className='w-full max-w-md'
            />
          )}
          {visual.mediaType !== 'video' && visual.mediaType !== 'audio' && (
            <img
              src={props.preview.url}
              alt={t('Preview')}
              className='max-h-[60vh] max-w-full rounded-lg object-contain'
            />
          )}
        </div>
      )}
    </Dialog>
  )
}
