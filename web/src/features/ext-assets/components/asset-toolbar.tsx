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
import { Calendar, List, Search, Table2, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { DataTableViewMode } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

type AssetToolbarProps = {
  search: string
  type: string
  fromDate: string
  toDate: string
  checkedCount: number
  isDeletingBulk: boolean
  viewMode: DataTableViewMode
  onSearchChange: (value: string) => void
  onTypeChange: (value: string) => void
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  onClearDates: () => void
  onConfirmBulkDelete: () => void
  onViewModeChange: (mode: DataTableViewMode) => void
}

export function AssetToolbar(props: AssetToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className='bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-3 ring-1 xl:flex-row xl:items-center xl:justify-between'>
      <div className='flex flex-wrap items-center gap-2.5'>
        <InputGroup className='w-full sm:w-56 md:w-64'>
          <InputGroupAddon>
            <Search aria-hidden='true' className='size-4' />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={t('Search')}
            placeholder={t('Search')}
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
          />
          {props.search && (
            <InputGroupAddon align='inline-end'>
              <InputGroupButton
                size='icon-xs'
                aria-label={t('Reset')}
                onClick={() => props.onSearchChange('')}
              >
                <X aria-hidden='true' className='size-3.5' />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <NativeSelect
          aria-label={t('Type')}
          value={props.type}
          onChange={(event) => props.onTypeChange(event.target.value)}
        >
          <NativeSelectOption value='all'>{t('All')}</NativeSelectOption>
          <NativeSelectOption value='image'>{t('Image')}</NativeSelectOption>
          <NativeSelectOption value='audio'>{t('Audio')}</NativeSelectOption>
          <NativeSelectOption value='video'>{t('Video')}</NativeSelectOption>
          <NativeSelectOption value='other'>{t('Other')}</NativeSelectOption>
        </NativeSelect>

        <div className='bg-muted/30 border-input flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1 sm:h-8 sm:py-0'>
          <Calendar
            aria-hidden='true'
            className='text-muted-foreground hidden size-3.5 shrink-0 sm:inline'
          />
          <label className='inline-flex items-center gap-1.5 text-xs'>
            <span className='text-muted-foreground font-medium whitespace-nowrap'>
              {t('Start date')}
            </span>
            <Input
              type='date'
              value={props.fromDate}
              max={props.toDate || undefined}
              onChange={(event) => props.onFromDateChange(event.target.value)}
              className='h-6 w-auto border-0 bg-transparent px-1 py-0 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent'
            />
          </label>
          <span
            aria-hidden='true'
            className='text-muted-foreground/50 text-xs select-none'
          >
            —
          </span>
          <label className='inline-flex items-center gap-1.5 text-xs'>
            <span className='text-muted-foreground font-medium whitespace-nowrap'>
              {t('End date')}
            </span>
            <Input
              type='date'
              value={props.toDate}
              min={props.fromDate || undefined}
              onChange={(event) => props.onToDateChange(event.target.value)}
              className='h-6 w-auto border-0 bg-transparent px-1 py-0 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent'
            />
          </label>
        </div>

        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!props.fromDate && !props.toDate}
          onClick={props.onClearDates}
        >
          {t('Clear dates')}
        </Button>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2 sm:justify-end'>
        <div className='flex items-center gap-2'>
          {props.checkedCount > 0 && (
            <Badge variant='secondary' className='tabular-nums'>
              {t('{{count}} selected', { count: props.checkedCount })}
            </Badge>
          )}
          <Button
            type='button'
            variant='destructive'
            size='sm'
            disabled={props.checkedCount === 0 || props.isDeletingBulk}
            onClick={props.onConfirmBulkDelete}
          >
            <Trash2 aria-hidden='true' className='size-3.5' />
            {t('Delete selected assets')}
          </Button>
        </div>

        <div
          role='group'
          aria-label={t('View mode')}
          className='bg-muted/60 inline-flex h-8 items-center rounded-lg border p-0.5'
        >
          <Button
            type='button'
            size='xs'
            variant={props.viewMode === 'card' ? 'default' : 'ghost'}
            aria-pressed={props.viewMode === 'card'}
            onClick={() => props.onViewModeChange('card')}
          >
            <List aria-hidden='true' className='size-3.5' />
            {t('List view')}
          </Button>
          <Button
            type='button'
            size='xs'
            variant={props.viewMode === 'table' ? 'default' : 'ghost'}
            aria-pressed={props.viewMode === 'table'}
            onClick={() => props.onViewModeChange('table')}
          >
            <Table2 aria-hidden='true' className='size-3.5' />
            {t('Table view')}
          </Button>
        </div>
      </div>
    </div>
  )
}
