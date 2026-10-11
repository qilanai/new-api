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
/** Placeholder until the real sales mailbox is decided. */
export const SALES_EMAIL = 'support@yiconnect.cn'

/** Used when the system status carries no docs link. */
export const DOCS_FALLBACK = 'https://docs.newapi.pro'

export const CONTAINER_CLASS = 'mx-auto max-w-6xl px-6'

export interface ClientApp {
  name: string
  /** @lobehub/icons name, e.g. "Cursor" or "Dify.Color". */
  icon?: string
  /** Static logo under web/public for apps the icon set lacks. */
  image?: string
}

/** Clients shown in the ecosystem marquee; brand names stay untranslated. */
export const CLIENT_APPS: readonly ClientApp[] = [
  { name: 'Cursor', icon: 'Cursor' },
  { name: 'Claude Code', icon: 'ClaudeCode.Color' },
  { name: 'Cline', icon: 'Cline' },
  { name: 'Continue', image: '/brand/clients/continue.png' },
  { name: 'Cherry Studio', icon: 'CherryStudio.Color' },
  { name: 'ChatBox', image: '/brand/clients/chatbox.png' },
  { name: 'LobeChat', icon: 'LobeHub.Color' },
  { name: 'NextChat', image: '/brand/clients/nextchat.svg' },
  { name: 'Open WebUI', icon: 'OpenWebUI' },
  { name: 'Dify', icon: 'Dify.Color' },
  { name: 'Coze', icon: 'Coze' },
  {
    name: 'Immersive Translate',
    image: '/brand/clients/immersive-translate.svg',
  },
]
