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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FolderOpen,
  Pencil,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { TimestampCell } from '@/components/activity-time-cell'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StaticDataTable, useDataTableViewMode } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { toIntlLocale } from '@/i18n/languages'
import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { AssetCard } from './components/asset-card'
import { AssetOverview } from './components/asset-overview'
import {
  AssetPreviewDialog,
  type PreviewState,
} from './components/asset-preview-dialog'
import { AssetToolbar } from './components/asset-toolbar'
import {
  formatAssetSize,
  getAssetVisual,
  type Asset,
  type Listing,
} from './lib/asset-utils'

export function AssetLibrary() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [viewMode, setViewMode] = useDataTableViewMode({
    storageKey: 'ext-assets-view-mode',
    defaultMode: 'card',
  })
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const isRoot = useAuthStore(
    (state) => state.auth.user?.role === ROLE.SUPER_ADMIN
  )
  const validDates = !fromDate || !toDate || fromDate <= toDate
  const [selected, setSelected] = useState<Asset | null>(null)
  const [checked, setChecked] = useState<string[]>([])
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')

  const listing = useQuery({
    queryKey: ['ext-assets', page, search, type, fromDate, toDate],
    enabled: validDates,
    queryFn: async () => {
      const res = await api.get('/api/ext/assets', {
        params: {
          page,
          search,
          type,
          created_after: fromDate
            ? Math.floor(new Date(`${fromDate}T00:00:00`).getTime() / 1000)
            : undefined,
          created_before: toDate
            ? Math.floor(new Date(`${toDate}T23:59:59`).getTime() / 1000)
            : undefined,
        },
      })
      return requireServerSuccess(res.data).data as Listing
    },
  })

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['ext-assets'] })

  const upload = useMutation({
    mutationFn: async (value: File) => {
      const form = new FormData()
      form.append('file', value)
      const res = await api.post('/api/ext/assets', form)
      requireServerSuccess(res.data)
    },
    onSuccess: () => {
      setFile(null)
      void refresh()
    },
  })

  const remove = useMutation({
    mutationFn: async (value: Asset) => {
      const res = await api.delete(`/api/ext/assets/${value.id}`)
      requireServerSuccess(res.data)
    },
    onSuccess: (_data, value) => {
      setSelected(null)
      setChecked((items) => items.filter((id) => id !== value.id))
      void refresh()
    },
  })

  const removeBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const res = await api.delete(`/api/ext/assets/${id}`)
          requireServerSuccess(res.data)
        })
      )
      return ids.filter((_, index) => results[index].status === 'rejected')
    },
    onSuccess: (failed) => {
      if (failed.length) {
        toast.error(t('Some assets could not be deleted'))
      }
      setChecked(failed)
      setConfirmBulk(false)
      void refresh()
    },
  })

  const rename = useMutation({
    mutationFn: async (value: { id: string; name: string }) => {
      const res = await api.patch(`/api/ext/assets/${value.id}`, {
        name: value.name,
      })
      requireServerSuccess(res.data)
    },
    onSuccess: () => {
      setEditing(null)
      void refresh()
    },
  })

  const openFile = useMutation({
    mutationFn: async (args: { asset: Asset; preview: boolean }) => {
      const res = await api.post(
        `/api/ext/assets/${args.asset.id}/download-url`,
        null,
        { params: { preview: args.preview } }
      )
      return (requireServerSuccess(res.data).data as { url: string }).url
    },
    onSuccess: (url, args) => {
      if (args.preview) {
        setPreview({ asset: args.asset, url })
      } else {
        window.location.assign(url)
      }
    },
  })

  const handlePreview = (asset: Asset) => {
    if (asset.preview_url) {
      setPreview({ asset, url: asset.preview_url })
      return
    }
    openFile.mutate({ asset, preview: true })
  }

  const currentItems = listing.data?.items ?? []
  const allCurrentChecked =
    currentItems.length > 0 &&
    currentItems.every((item) => checked.includes(item.id))

  const toggleAllCurrentPage = (value: boolean) => {
    const pageIds = currentItems.map((item) => item.id)
    setChecked((items) => {
      if (value) {
        return [...new Set([...items, ...pageIds])]
      }
      return items.filter((id) => !pageIds.includes(id))
    })
  }

  const toggleSingleAsset = (assetId: string, value: boolean) => {
    setChecked((items) =>
      value ? [...items, assetId] : items.filter((id) => id !== assetId)
    )
  }

  const selectAsset = (asset: Asset) => (
    <Checkbox
      aria-label={`${t('Select')} ${asset.name}`}
      checked={checked.includes(asset.id)}
      onCheckedChange={(value) => toggleSingleAsset(asset.id, Boolean(value))}
    />
  )

  const assetName = (asset: Asset) =>
    editing === asset.id ? (
      <Input
        aria-label={t('Name')}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && name.trim()) {
            rename.mutate({ id: asset.id, name })
          }
          if (event.key === 'Escape') {
            setEditing(null)
          }
        }}
        className='max-w-sm'
      />
    ) : (
      <span className='min-w-0 text-sm font-medium break-all'>
        {asset.name}
      </span>
    )

  const assetActions = (asset: Asset) => {
    const visual = getAssetVisual(asset.content_type)
    return (
      <div className='flex flex-wrap items-center gap-1.5'>
        {editing === asset.id ? (
          <>
            <Button
              type='button'
              size='sm'
              disabled={!name.trim() || rename.isPending}
              onClick={() => rename.mutate({ id: asset.id, name })}
            >
              <Check aria-hidden='true' className='size-3.5' />
              {t('Save')}
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => setEditing(null)}
            >
              <X aria-hidden='true' className='size-3.5' />
              {t('Cancel')}
            </Button>
          </>
        ) : (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => {
              setEditing(asset.id)
              setName(asset.name)
            }}
          >
            <Pencil aria-hidden='true' className='size-3.5' />
            {t('Edit')}
          </Button>
        )}
        {visual.canPreview && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => handlePreview(asset)}
          >
            <Eye aria-hidden='true' className='size-3.5' />
            {t('Preview')}
          </Button>
        )}
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => openFile.mutate({ asset, preview: false })}
        >
          <Download aria-hidden='true' className='size-3.5' />
          {t('Download')}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='destructive'
          onClick={() => setSelected(asset)}
        >
          <Trash2 aria-hidden='true' className='size-3.5' />
          {t('Delete')}
        </Button>
      </div>
    )
  }

  const totalPages = listing.data
    ? Math.max(1, Math.ceil(listing.data.total / listing.data.page_size))
    : 1

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Asset Library')}</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={listing.isFetching}
          onClick={() => void listing.refetch()}
        >
          <RefreshCw
            aria-hidden='true'
            className={cn('size-3.5', listing.isFetching && 'animate-spin')}
          />
          {t('Refresh')}
        </Button>
        {isRoot && (
          <Button size='sm' render={<Link to='/ext/assets/settings' />}>
            <Settings2 aria-hidden='true' className='size-3.5' />
            {t('Asset settings')}
          </Button>
        )}
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <AssetOverview
            file={file}
            isUploading={upload.isPending}
            listing={listing.data}
            onSelectFile={setFile}
            onUpload={(target) => upload.mutate(target)}
          />

          <AssetToolbar
            search={search}
            type={type}
            fromDate={fromDate}
            toDate={toDate}
            checkedCount={checked.length}
            isDeletingBulk={removeBulk.isPending}
            viewMode={viewMode}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            onTypeChange={(value) => {
              setType(value)
              setPage(1)
            }}
            onFromDateChange={(value) => {
              setFromDate(value)
              setPage(1)
            }}
            onToDateChange={(value) => {
              setToDate(value)
              setPage(1)
            }}
            onClearDates={() => {
              setFromDate('')
              setToDate('')
              setPage(1)
            }}
            onConfirmBulkDelete={() => setConfirmBulk(true)}
            onViewModeChange={setViewMode}
          />

          {!validDates && (
            <Alert variant='destructive' role='alert'>
              <AlertTriangle aria-hidden='true' />
              <AlertDescription>
                {t('Start date must be before end date')}
              </AlertDescription>
            </Alert>
          )}

          {listing.isLoading && <LoadingState />}
          {listing.isError && (
            <ErrorState
              title={t('Failed to load data')}
              onRetry={() => void listing.refetch()}
            />
          )}
          {listing.data && listing.data.items.length === 0 && (
            <EmptyState
              icon={FolderOpen}
              title={t('No results found.')}
              bordered
              className='bg-card/40 min-h-[240px] rounded-xl border-dashed'
            />
          )}

          {listing.data &&
            listing.data.items.length > 0 &&
            viewMode === 'card' && (
              <div className='space-y-3'>
                <div className='text-muted-foreground flex items-center justify-between px-1 text-xs'>
                  <label className='inline-flex cursor-pointer items-center gap-2 select-none'>
                    <Checkbox
                      aria-label={t('Select all')}
                      checked={allCurrentChecked}
                      onCheckedChange={toggleAllCurrentPage}
                    />
                    <span>{t('Select all')}</span>
                  </label>
                  <span>{t('File')}</span>
                </div>
                <ul className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {listing.data.items.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      isChecked={checked.includes(asset.id)}
                      isEditing={editing === asset.id}
                      editingName={name}
                      isSavingName={rename.isPending}
                      onCheckedChange={(value) =>
                        toggleSingleAsset(asset.id, Boolean(value))
                      }
                      onEditingNameChange={setName}
                      onStartEdit={(target) => {
                        setEditing(target.id)
                        setName(target.name)
                      }}
                      onCancelEdit={() => setEditing(null)}
                      onSaveEdit={(target) =>
                        rename.mutate({ id: target.id, name })
                      }
                      onPreview={handlePreview}
                      onDownload={(target) =>
                        openFile.mutate({ asset: target, preview: false })
                      }
                      onDelete={(target) => setSelected(target)}
                    />
                  ))}
                </ul>
              </div>
            )}

          {listing.data &&
            listing.data.items.length > 0 &&
            viewMode === 'table' && (
              <StaticDataTable
                data={listing.data.items}
                getRowKey={(asset) => asset.id}
                tableClassName='min-w-[680px]'
                columns={[
                  {
                    id: 'select',
                    header: (
                      <Checkbox
                        aria-label={t('Select all')}
                        checked={allCurrentChecked}
                        onCheckedChange={toggleAllCurrentPage}
                      />
                    ),
                    className: 'w-10',
                    cell: selectAsset,
                  },
                  {
                    id: 'name',
                    header: t('Name'),
                    cell: (asset) => {
                      const visual = getAssetVisual(asset.content_type)
                      const AssetIcon = visual.icon
                      return (
                        <div className='flex min-w-0 items-center gap-2.5'>
                          {asset.preview_url && visual.mediaType === 'image' ? (
                            <img
                              src={asset.preview_url}
                              alt={asset.name}
                              loading='lazy'
                              className='size-9 shrink-0 rounded-lg border object-cover'
                            />
                          ) : (
                            <IconBadge
                              tone={visual.tone}
                              size='md'
                              className='rounded-lg ring-1 ring-current/15'
                            >
                              <AssetIcon
                                aria-hidden='true'
                                className='size-4'
                              />
                            </IconBadge>
                          )}
                          {assetName(asset)}
                        </div>
                      )
                    },
                  },
                  {
                    id: 'type',
                    header: t('Type'),
                    cell: (asset) => {
                      const visual = getAssetVisual(asset.content_type)
                      const AssetIcon = visual.icon
                      return (
                        <div className='flex items-center gap-1.5'>
                          <Badge variant='secondary' className='gap-1 text-xs'>
                            <AssetIcon
                              aria-hidden='true'
                              className='size-3.5'
                            />
                            {t(visual.labelKey)}
                          </Badge>
                          <Badge
                            variant='outline'
                            className='font-mono text-[10px] font-normal'
                          >
                            {visual.formatLabel}
                          </Badge>
                        </div>
                      )
                    },
                  },
                  {
                    id: 'size',
                    header: t('Size:'),
                    cellClassName: 'tabular-nums',
                    cell: (asset) => formatAssetSize(asset.size_bytes, locale),
                  },
                  {
                    id: 'created',
                    header: t('Created'),
                    cell: (asset) =>
                      asset.created_at ? (
                        <TimestampCell
                          timestamp={asset.created_at}
                          locale={locale}
                          justNowLabel={t('Just now')}
                        />
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      ),
                  },
                  { id: 'actions', header: t('Actions'), cell: assetActions },
                ]}
              />
            )}

          {listing.data && (
            <div className='bg-card ring-foreground/10 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 ring-1'>
              <span className='text-muted-foreground text-xs tabular-nums'>
                {t('Page {{current}} of {{total}}', {
                  current: page,
                  total: totalPages,
                })}
              </span>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft aria-hidden='true' className='size-3.5' />
                  {t('Previous')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page * listing.data.page_size >= listing.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  {t('Next')}
                  <ChevronRight aria-hidden='true' className='size-3.5' />
                </Button>
              </div>
            </div>
          )}
        </div>

        <AssetPreviewDialog
          preview={preview}
          onClose={() => setPreview(null)}
          onDownload={(asset) => openFile.mutate({ asset, preview: false })}
        />

        <ConfirmDialog
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null)
            }
          }}
          title={t('Delete')}
          desc={t('Are you sure you want to delete this item?')}
          destructive
          isLoading={remove.isPending}
          handleConfirm={() => {
            if (selected) {
              remove.mutate(selected)
            }
          }}
        />
        <ConfirmDialog
          open={confirmBulk}
          onOpenChange={setConfirmBulk}
          title={t('Delete selected assets')}
          desc={t('Are you sure?')}
          destructive
          isLoading={removeBulk.isPending}
          handleConfirm={() => removeBulk.mutate(checked)}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
