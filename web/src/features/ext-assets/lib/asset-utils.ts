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
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  type LucideIcon,
} from 'lucide-react'

import type { IconBadgeTone } from '@/components/ui/icon-badge'
import { formatNumber } from '@/lib/format'

export type Asset = {
  id: string
  name: string
  original_name?: string
  content_type: string
  size_bytes: number
  created_at?: number
  updated_at?: number
  preview_url?: string
}

export type Listing = {
  items: Asset[]
  total: number
  page: number
  page_size: number
  used_bytes: number
  quota_bytes: number
}

export type AssetMediaType = 'image' | 'video' | 'audio' | 'other'

export type AssetVisual = {
  mediaType: AssetMediaType
  icon: LucideIcon
  tone: IconBadgeTone
  labelKey: 'Image' | 'Audio' | 'Video' | 'Other'
  formatLabel: string
  canPreview: boolean
}

const PREVIEWABLE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

const PREVIEWABLE_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
])

const PREVIEWABLE_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
])

function getFormatLabel(contentType: string): string {
  const normalized = contentType.toLowerCase().trim()
  const slashIndex = normalized.indexOf('/')
  const subtype =
    slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized
  const cleanSubtype = subtype.split(';')[0]?.trim() || 'FILE'
  if (cleanSubtype === 'Quicktime'.toLowerCase()) {
    return 'MOV'
  }
  if (cleanSubtype === 'mpeg') {
    return 'MP3'
  }
  if (cleanSubtype === 'octet-stream') {
    return 'BIN'
  }
  if (cleanSubtype === 'plain') {
    return 'TXT'
  }
  return cleanSubtype.toUpperCase().slice(0, 8)
}

export function formatAssetSize(
  bytes: number,
  locale: string | undefined
): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${formatNumber(value, locale)} ${units[unit]}`
}

export function getAssetVisual(contentType: string): AssetVisual {
  const normalized = contentType.toLowerCase().trim()
  const formatLabel = getFormatLabel(normalized)
  if (normalized.startsWith('image/')) {
    return {
      mediaType: 'image',
      icon: FileImage,
      tone: 'primary',
      labelKey: 'Image',
      formatLabel,
      canPreview: PREVIEWABLE_IMAGE_TYPES.has(normalized),
    }
  }
  if (normalized.startsWith('video/')) {
    return {
      mediaType: 'video',
      icon: FileVideo,
      tone: 'warning',
      labelKey: 'Video',
      formatLabel,
      canPreview: PREVIEWABLE_VIDEO_TYPES.has(normalized),
    }
  }
  if (normalized.startsWith('audio/')) {
    return {
      mediaType: 'audio',
      icon: FileAudio,
      tone: 'info',
      labelKey: 'Audio',
      formatLabel,
      canPreview: PREVIEWABLE_AUDIO_TYPES.has(normalized),
    }
  }
  return {
    mediaType: 'other',
    icon: FileText,
    tone: 'neutral',
    labelKey: 'Other',
    formatLabel,
    canPreview: false,
  }
}
