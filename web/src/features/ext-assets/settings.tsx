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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, HardDrive, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as z from 'zod'

import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import { toIntlLocale } from '@/i18n/languages'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { formatAssetSize } from './lib/asset-utils'

const KB = 1024
const MB = 1024 ** 2
const GB = 1024 ** 3

type SizeUnit = 'B' | 'KB' | 'MB' | 'GB'

const UNIT_MULTIPLIER: Record<SizeUnit, number> = {
  B: 1,
  KB,
  MB,
  GB,
}

const DISPLAY_UNITS: SizeUnit[] = ['KB', 'MB', 'GB']

const MAX_FILE_PRESETS = [
  { label: '10 MB', bytes: 10 * MB, unit: 'MB' as SizeUnit },
  { label: '50 MB', bytes: 50 * MB, unit: 'MB' as SizeUnit },
  { label: '100 MB', bytes: 100 * MB, unit: 'MB' as SizeUnit },
  { label: '500 MB', bytes: 500 * MB, unit: 'MB' as SizeUnit },
  { label: '1 GB', bytes: 1 * GB, unit: 'GB' as SizeUnit },
]

const USER_QUOTA_PRESETS = [
  { label: '500 MB', bytes: 500 * MB, unit: 'MB' as SizeUnit },
  { label: '1 GB', bytes: 1 * GB, unit: 'GB' as SizeUnit },
  { label: '5 GB', bytes: 5 * GB, unit: 'GB' as SizeUnit },
  { label: '10 GB', bytes: 10 * GB, unit: 'GB' as SizeUnit },
  { label: '50 GB', bytes: 50 * GB, unit: 'GB' as SizeUnit },
]

function detectBestUnit(bytes: number): SizeUnit {
  if (bytes >= GB && bytes % GB === 0) {
    return 'GB'
  }
  if (bytes >= MB && bytes % MB === 0) {
    return 'MB'
  }
  if (bytes >= KB && bytes % KB === 0) {
    return 'KB'
  }
  return 'B'
}

function formatUnitAmount(bytes: number, unit: SizeUnit): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return ''
  }
  const raw = bytes / UNIT_MULTIPLIER[unit]
  if (Number.isInteger(raw)) {
    return String(raw)
  }
  return String(Number(raw.toFixed(2)))
}

const schema = z.object({
  enabled: z.boolean(),
  max_file_bytes: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 ** 3),
  user_quota_bytes: z
    .number()
    .int()
    .min(1)
    .max(1024 ** 4),
  allowed_content_types: z.string().max(4096),
})
type Settings = z.infer<typeof schema>
type SettingsResponse = {
  settings: Settings
  oss_region: string
  oss_bucket: string
  oss_endpoint: string
  credential_mode: string
}

export function AssetSettings() {
  const { t } = useTranslation()
  const settings = useQuery({
    queryKey: ['ext-asset-settings'],
    queryFn: async () => {
      const res = await api.get('/api/ext/assets-settings')
      return requireServerSuccess(res.data).data as SettingsResponse
    },
  })
  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Asset settings')}</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button variant='outline' size='sm' render={<Link to='/ext/assets' />}>
          <ArrowLeft aria-hidden='true' className='size-3.5' />
          {t('Asset Library')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        {settings.isLoading && <LoadingState />}
        {settings.isError && (
          <ErrorState
            title={t('Failed to load data')}
            onRetry={() => void settings.refetch()}
          />
        )}
        {settings.data && <AssetSettingsForm data={settings.data} />}
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

type ByteSizeFieldProps = {
  id: string
  label: string
  bytes: number
  maxBytes: number
  locale: string | undefined
  hasError: boolean
  errorMessage: string
  presets: Array<{ label: string; bytes: number; unit: SizeUnit }>
  onChange: (nextBytes: number) => void
}

function ByteSizeField(props: ByteSizeFieldProps) {
  const [unit, setUnit] = useState<SizeUnit>(() => detectBestUnit(props.bytes))
  const [draft, setDraft] = useState<string>(() =>
    formatUnitAmount(props.bytes, detectBestUnit(props.bytes))
  )

  const handleInputChange = (rawValue: string) => {
    setDraft(rawValue)
    const parsed = Number(rawValue)
    if (!rawValue.trim() || !Number.isFinite(parsed)) {
      props.onChange(0)
      return
    }
    const nextBytes = Math.round(parsed * UNIT_MULTIPLIER[unit])
    props.onChange(nextBytes)
  }

  const handleUnitSelect = (nextUnit: SizeUnit) => {
    setUnit(nextUnit)
    if (
      props.bytes >= UNIT_MULTIPLIER[nextUnit] &&
      props.bytes % UNIT_MULTIPLIER[nextUnit] === 0
    ) {
      setDraft(formatUnitAmount(props.bytes, nextUnit))
      return
    }
    const currentAmount = Number(draft)
    if (Number.isFinite(currentAmount) && currentAmount > 0) {
      const nextBytes = Math.min(
        props.maxBytes,
        Math.max(1, Math.round(currentAmount * UNIT_MULTIPLIER[nextUnit]))
      )
      setDraft(formatUnitAmount(nextBytes, nextUnit))
      props.onChange(nextBytes)
    }
  }

  const handlePresetClick = (preset: {
    label: string
    bytes: number
    unit: SizeUnit
  }) => {
    setUnit(preset.unit)
    setDraft(formatUnitAmount(preset.bytes, preset.unit))
    props.onChange(preset.bytes)
  }

  const unitOptions: SizeUnit[] =
    unit === 'B' ? ['B', ...DISPLAY_UNITS] : DISPLAY_UNITS

  return (
    <div className='bg-muted/15 space-y-2.5 rounded-xl border p-3.5'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <label htmlFor={props.id} className='text-sm font-medium'>
          {props.label}
        </label>
        {Number.isFinite(props.bytes) && props.bytes > 0 && (
          <Badge
            variant='secondary'
            className='font-mono text-[11px] font-medium tabular-nums'
          >
            {formatAssetSize(props.bytes, props.locale)}
          </Badge>
        )}
      </div>

      <InputGroup className='bg-background h-9'>
        <InputGroupInput
          id={props.id}
          type='number'
          min={1}
          step='any'
          value={draft}
          onChange={(event) => handleInputChange(event.target.value)}
          aria-invalid={props.hasError}
          className='font-mono text-sm tabular-nums'
        />
        <InputGroupAddon align='inline-end' className='gap-0.5 pr-1'>
          {unitOptions.map((item) => {
            const isSelected = unit === item
            return (
              <button
                key={item}
                type='button'
                onClick={() => handleUnitSelect(item)}
                className={cn(
                  'h-6 rounded-md px-2 font-mono text-xs font-medium transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item}
              </button>
            )
          })}
        </InputGroupAddon>
      </InputGroup>

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-1'>
          {props.presets.map((preset) => {
            const isActive = props.bytes === preset.bytes
            return (
              <button
                key={preset.label}
                type='button'
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors',
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                    : 'border-border/70 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        {Number.isFinite(props.bytes) && props.bytes > 0 && (
          <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
            {formatNumber(props.bytes, props.locale)} B
          </span>
        )}
      </div>

      {props.hasError && (
        <span role='alert' className='text-destructive block text-xs'>
          {props.errorMessage}
        </span>
      )}
    </div>
  )
}

function AssetSettingsForm(props: { data: SettingsResponse }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  let credentialLabel = t('Not configured')
  let isConfigured = false
  if (props.data.credential_mode === 'ecs_role') {
    credentialLabel = t('ECS role')
    isConfigured = true
  }
  if (props.data.credential_mode === 'environment') {
    credentialLabel = t('Environment variables')
    isConfigured = true
  }
  const queryClient = useQueryClient()
  const form = useForm<Settings>({
    resolver: zodResolver(schema),
    defaultValues: props.data.settings,
  })
  const enabledValue = useWatch({
    control: form.control,
    name: 'enabled',
  })
  const maxFileBytes = useWatch({
    control: form.control,
    name: 'max_file_bytes',
  })
  const userQuotaBytes = useWatch({
    control: form.control,
    name: 'user_quota_bytes',
  })

  const save = useMutation({
    mutationFn: async (values: Settings) => {
      const res = await api.put('/api/ext/assets-settings', values)
      return requireServerSuccess(res.data).data as Settings
    },
    onSuccess: (data) => {
      form.reset(data)
      void queryClient.invalidateQueries({ queryKey: ['ext-asset-settings'] })
      toast.success(t('Settings saved'))
    },
  })

  const connectionItems = [
    {
      label: t('Region'),
      value: props.data.oss_region || '—',
    },
    {
      label: t('Bucket'),
      value: props.data.oss_bucket || '—',
    },
    {
      label: 'Endpoint',
      value: props.data.oss_endpoint || t('Default'),
    },
    {
      label: t('Credential source'),
      value: credentialLabel,
    },
  ]

  return (
    <div className='max-w-3xl space-y-5'>
      <Card>
        <CardHeader className='border-b'>
          <div className='flex items-center gap-3'>
            <IconBadge tone='primary' size='md' className='rounded-lg'>
              <HardDrive aria-hidden='true' className='size-4' />
            </IconBadge>
            <div className='space-y-0.5'>
              <CardTitle>{t('OSS connection')}</CardTitle>
              <CardDescription>
                {t(
                  'OSS connection and credentials are configured in the server environment.'
                )}
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge
              variant={isConfigured ? 'secondary' : 'outline'}
              className='gap-1.5'
            >
              <span
                aria-hidden='true'
                className={cn(
                  'size-1.5 rounded-full',
                  isConfigured ? 'bg-success' : 'bg-muted-foreground/50'
                )}
              />
              {credentialLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {connectionItems.map((item) => (
              <div
                key={item.label}
                className='bg-muted/25 rounded-lg border px-3.5 py-2.5'
              >
                <div className='text-muted-foreground text-xs'>
                  {item.label}
                </div>
                <div className='mt-1 font-mono text-sm font-medium break-all'>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <form
        onSubmit={form.handleSubmit((value) => save.mutate(value))}
        className='block'
      >
        <Card>
          <CardHeader className='border-b'>
            <div className='flex items-center gap-3'>
              <IconBadge tone='primary' size='md' className='rounded-lg'>
                <SlidersHorizontal aria-hidden='true' className='size-4' />
              </IconBadge>
              <CardTitle>{t('Upload settings')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <label className='bg-muted/20 hover:bg-muted/35 flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors'>
              <span className='text-sm font-medium'>{t('Allow uploads')}</span>
              <Switch
                checked={enabledValue}
                onCheckedChange={(value) =>
                  form.setValue('enabled', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </label>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <ByteSizeField
                id='ext-assets-max-file-bytes'
                label={t('Maximum file size (bytes)')}
                bytes={maxFileBytes}
                maxBytes={5 * 1024 ** 3}
                locale={locale}
                hasError={Boolean(form.formState.errors.max_file_bytes)}
                errorMessage={t('Invalid asset settings')}
                presets={MAX_FILE_PRESETS}
                onChange={(nextBytes) =>
                  form.setValue('max_file_bytes', nextBytes, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />

              <ByteSizeField
                id='ext-assets-user-quota-bytes'
                label={t('User storage quota (bytes)')}
                bytes={userQuotaBytes}
                maxBytes={1024 ** 4}
                locale={locale}
                hasError={Boolean(form.formState.errors.user_quota_bytes)}
                errorMessage={t('Invalid asset settings')}
                presets={USER_QUOTA_PRESETS}
                onChange={(nextBytes) =>
                  form.setValue('user_quota_bytes', nextBytes, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='ext-assets-allowed-mime'
                className='block text-sm font-medium'
              >
                {t('Allowed MIME types')}
              </label>
              <Input
                id='ext-assets-allowed-mime'
                {...form.register('allowed_content_types')}
                placeholder='image/png,image/jpeg'
              />
              <p className='text-muted-foreground text-xs'>
                {t(
                  'Separate MIME types with commas; leave empty to allow all types.'
                )}
              </p>
            </div>
          </CardContent>
          <CardFooter className='justify-end'>
            <Button
              type='submit'
              disabled={save.isPending || !form.formState.isDirty}
            >
              <Check aria-hidden='true' className='size-4' />
              {t('Save')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
