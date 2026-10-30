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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { AssetLibrary } from '../index'
import { AssetSettings } from '../settings'

it('lists assets in a media card grid and asks for confirmation before deleting from the card menu', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        items: [
          {
            id: 'a',
            name: 'sample.png',
            content_type: 'image/png',
            size_bytes: 12,
            preview_url: 'https://example.com/sample.png',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        used_bytes: 12,
        quota_bytes: 100,
      },
    },
  })
  const deleteRequest = vi
    .spyOn(api, 'delete')
    .mockResolvedValue({ data: { success: true } })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AssetLibrary />
    </QueryClientProvider>
  )
  expect(await screen.findByText(/sample.png/)).toBeTruthy()
  expect(
    screen.getByRole('img', { name: 'sample.png' }).getAttribute('src')
  ).toBe('https://example.com/sample.png')
  await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
  expect(deleteRequest).not.toHaveBeenCalled()
  expect(screen.getByRole('alertdialog')).toBeTruthy()
})

it('keeps selected assets until bulk deletion is confirmed', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        items: [
          {
            id: 'a',
            name: 'sample.png',
            content_type: 'image/png',
            size_bytes: 12,
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        used_bytes: 12,
        quota_bytes: 100,
      },
    },
  })
  const deleteRequest = vi
    .spyOn(api, 'delete')
    .mockResolvedValue({ data: { success: true } })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AssetLibrary />
    </QueryClientProvider>
  )
  await userEvent.click(
    await screen.findByRole('checkbox', { name: 'Select sample.png' })
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Delete selected assets' })
  )
  expect(deleteRequest).not.toHaveBeenCalled()
  expect(screen.getByRole('alertdialog')).toBeTruthy()
})

it('sends the selected local date range with inclusive end of day', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        used_bytes: 0,
        quota_bytes: 100,
      },
    },
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AssetLibrary />
    </QueryClientProvider>
  )
  await screen.findByText('No results found.')
  fireEvent.change(screen.getByLabelText('Start date'), {
    target: { value: '2026-10-05' },
  })
  fireEvent.change(screen.getByLabelText('End date'), {
    target: { value: '2026-10-06' },
  })
  await waitFor(() =>
    expect(get).toHaveBeenLastCalledWith('/api/ext/assets', {
      params: {
        page: 1,
        search: '',
        type: 'all',
        created_after: Math.floor(
          new Date('2026-10-05T00:00:00').getTime() / 1000
        ),
        created_before: Math.floor(
          new Date('2026-10-06T23:59:59').getTime() / 1000
        ),
      },
    })
  )
  await userEvent.click(screen.getByRole('button', { name: 'Clear dates' }))
  await waitFor(() =>
    expect(
      (screen.getByLabelText('Start date') as HTMLInputElement).value
    ).toBe('')
  )
})

it('saves non-secret asset policy from the administrator page', async () => {
  const settings = {
    enabled: true,
    max_file_bytes: 1024,
    user_quota_bytes: 4096,
    allowed_content_types: '',
  }
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        settings,
        oss_region: 'cn-test',
        oss_bucket: 'private',
        oss_endpoint: '',
        credential_mode: 'ecs_role',
      },
    },
  })
  const put = vi.spyOn(api, 'put').mockResolvedValue({
    data: { success: true, data: { ...settings, max_file_bytes: 2048 } },
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const root = createRootRoute({ component: Outlet })
  const settingsRoute = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: AssetSettings,
  })
  const router = createRouter({
    routeTree: root.addChildren([settingsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const maxFile = (await screen.findByLabelText(
    'Maximum file size (bytes)'
  )) as HTMLInputElement
  expect(maxFile.value).toBe('1')
  fireEvent.change(maxFile, { target: { value: '2' } })
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith('/api/ext/assets-settings', {
      ...settings,
      max_file_bytes: 2048,
    })
  )
})

it('switches between card grid and table while keeping the selected asset', async () => {
  localStorage.removeItem('ext-assets-view-mode')
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        items: [
          {
            id: 'a',
            name: 'sample.png',
            content_type: 'image/png',
            size_bytes: 2138807,
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        used_bytes: 2138807,
        quota_bytes: 1073741824,
      },
    },
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AssetLibrary />
    </QueryClientProvider>
  )
  await userEvent.click(
    await screen.findByRole('checkbox', { name: 'Select sample.png' })
  )
  expect(screen.getByText('2.04 MB / 1 GB')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Table view' }))
  expect(screen.getByRole('table')).toBeTruthy()
  expect(
    screen.getByRole('checkbox', { name: 'Select sample.png' })
  ).toHaveAttribute('data-checked')
  expect(screen.getByText('2.04 MB')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'List view' }))
  expect(screen.queryByRole('table')).toBeNull()
  expect(
    screen.getByRole('checkbox', { name: 'Select sample.png' })
  ).toHaveAttribute('data-checked')
  localStorage.removeItem('ext-assets-view-mode')
})

it('shows selected upload file metadata and opens image preview in a dialog', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: {
        items: [
          {
            id: 'a',
            name: 'banner.png',
            content_type: 'image/png',
            size_bytes: 1024,
            created_at: 1760000000,
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        used_bytes: 1024,
        quota_bytes: 4096,
      },
    },
  })
  const post = vi.spyOn(api, 'post').mockImplementation(async (url) => {
    if (url === '/api/ext/assets/a/download-url') {
      return {
        data: {
          success: true,
          data: { url: 'https://example.com/banner.png' },
        },
      }
    }
    return { data: { success: true } }
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AssetLibrary />
    </QueryClientProvider>
  )
  expect(await screen.findByText('banner.png')).toBeTruthy()

  const fileInput = screen.getByLabelText('File') as HTMLInputElement
  const uploadFile = new File(['hello'], 'draft.png', { type: 'image/png' })
  await userEvent.upload(fileInput, uploadFile)
  expect(screen.getByText('draft.png')).toBeTruthy()
  expect(
    screen.getByRole('button', { name: 'Choose another file' })
  ).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Upload' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith('/api/ext/assets', expect.any(FormData))
  )

  await userEvent.click(
    screen.getByRole('button', { name: 'Preview banner.png' })
  )
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toBeTruthy()
  expect(screen.getByRole('img', { name: 'Preview' }).getAttribute('src')).toBe(
    'https://example.com/banner.png'
  )
})
