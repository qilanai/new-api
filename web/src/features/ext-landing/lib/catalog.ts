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
import type { TFunction } from 'i18next'

export type ModelCategory =
  | 'all'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'cn'
  | 'media'

export interface ModelTab {
  value: ModelCategory
  label: string
}

export interface ModelCard {
  id: string
  categories: ModelCategory[]
  vendor: string
  name: string
  description: string
  priceLabel: string
  badge?: 'new' | 'hot'
}

export interface QuickModel {
  id: string
  category: string
  name: string
  description: string
}

/** Tabs of the model plaza. The copy is resolved here so every key is a t() literal. */
export function buildModelTabs(t: TFunction): ModelTab[] {
  return [
    { value: 'all', label: t('All') },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'cn', label: t('Chinese models') },
    { value: 'media', label: t('Image & speech') },
  ]
}

export function buildModelCards(t: TFunction): ModelCard[] {
  return [
    {
      id: 'gpt-flagship',
      categories: ['all', 'openai'],
      vendor: t('OpenAI · flagship'),
      name: t('GPT flagship series'),
      description: t(
        'Complex reasoning, long context and tool use for production workloads.'
      ),
      priceLabel: t('Input / Output'),
      badge: 'hot',
    },
    {
      id: 'gpt-light',
      categories: ['all', 'openai'],
      vendor: t('OpenAI · lightweight'),
      name: t('GPT lightweight series'),
      description: t(
        'Fast and cheap for high-volume simple tasks, classification and summaries.'
      ),
      priceLabel: t('Input / Output'),
    },
    {
      id: 'claude',
      categories: ['all', 'anthropic'],
      vendor: t('Anthropic · coding & agents'),
      name: t('Claude series'),
      description: t(
        'Code generation and repair, long documents, works with Cursor and Claude Code.'
      ),
      priceLabel: t('Input / Output'),
      badge: 'new',
    },
    {
      id: 'gemini',
      categories: ['all', 'google'],
      vendor: t('Google · multimodal'),
      name: t('Gemini series'),
      description: t(
        'Reads images, documents and video in one request with a very long context.'
      ),
      priceLabel: t('Input / Output'),
    },
    {
      id: 'deepseek',
      categories: ['all', 'deepseek', 'cn'],
      vendor: t('DeepSeek · best value'),
      name: t('DeepSeek series'),
      description: t('Chat and reasoning lines, strong in Chinese, low cost.'),
      priceLabel: t('Input / Output'),
      badge: 'hot',
    },
    {
      id: 'cn',
      categories: ['all', 'cn'],
      vendor: t('Chinese models'),
      name: t('Qwen · Kimi · Doubao · GLM'),
      description: t(
        'Mainstream Chinese models behind one key, switch and compare any time.'
      ),
      priceLabel: t('Input / Output'),
    },
    {
      id: 'image',
      categories: ['media', 'openai'],
      vendor: t('Image generation'),
      name: t('Text-to-image · Image-to-image'),
      description: t(
        'High-resolution output, Chinese prompts welcome, batch generation.'
      ),
      priceLabel: t('Per image'),
    },
    {
      id: 'speech',
      categories: ['media', 'openai'],
      vendor: t('Speech'),
      name: t('TTS · Speech recognition'),
      description: t(
        'Natural voices and real-time multilingual recognition for dubbing and subtitles.'
      ),
      priceLabel: t('Per minute'),
    },
    {
      id: 'video',
      categories: ['media', 'google'],
      vendor: t('Video understanding'),
      name: t('Video & audio understanding'),
      description: t(
        'Upload audio or video and get summaries, subtitles and structured data.'
      ),
      priceLabel: t('Per token'),
    },
  ]
}

/** Shortcut list shown beside the hero copy. */
export function buildQuickModels(t: TFunction): QuickModel[] {
  return [
    {
      id: 'gpt',
      category: t('LLM'),
      name: t('GPT series'),
      description: t('General chat, reasoning and code'),
    },
    {
      id: 'claude',
      category: t('LLM'),
      name: t('Claude series'),
      description: t('Long context and agent workflows'),
    },
    {
      id: 'gemini',
      category: t('Multimodal'),
      name: t('Gemini series'),
      description: t('Image, audio and video understanding'),
    },
    {
      id: 'cn',
      category: t('Chinese models'),
      name: t('DeepSeek · Qwen'),
      description: t('Best value for Chinese workloads'),
    },
    {
      id: 'image',
      category: t('Image generation'),
      name: t('Text-to-image · Image-to-image'),
      description: t('Posters, product shots, illustrations'),
    },
    {
      id: 'speech',
      category: t('Speech'),
      name: t('TTS · Speech recognition'),
      description: t('Dubbing, subtitles, live transcription'),
    },
  ]
}
