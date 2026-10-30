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
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { Route as ChatRoute } from '@/routes/_authenticated/apps/chat/index'
import { Route as AppsRoute } from '@/routes/_authenticated/apps/index'
import { Route as StudioRoute } from '@/routes/_authenticated/apps/studio/index'
import { Route as WorkspaceNestedRoute } from '@/routes/_authenticated/apps/workspace/$'
import { Route as WorkspaceRoute } from '@/routes/_authenticated/apps/workspace/index'
import { Route as AuthenticatedRoute } from '@/routes/_authenticated/route'
import { useAuthStore, type AuthBundle } from '@/stores/auth-store'

let client: QueryClient
let applicationsFail: boolean

function login(userId: number) {
  const bundle: AuthBundle = {
    access_token: 'test-browser-token',
    token_type: 'Bearer',
    access_expires_at: Math.floor(Date.now() / 1000) + 600,
    user: { id: userId, username: `user-${userId}`, role: 1 },
    session: {
      sid: `session-${userId}`,
      current: true,
      login_method: 'password',
      ip: '127.0.0.1',
      user_agent: 'test',
      created_at: 1,
      last_active_at: 1,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  }
  useAuthStore.getState().auth.setBundle(bundle)
}

async function openWorkspace(path: string) {
  const root = createRootRoute({ component: Outlet })
  const authenticated = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
    component: Outlet,
    beforeLoad: AuthenticatedRoute.options.beforeLoad as (context: {
      location: { href: string }
    }) => Promise<void>,
  })
  const apps = createRoute({
    getParentRoute: () => authenticated,
    path: '/apps',
    component: AppsRoute.options.component,
  })
  const chat = createRoute({
    getParentRoute: () => authenticated,
    path: '/apps/chat',
    component: ChatRoute.options.component,
  })
  const studio = createRoute({
    getParentRoute: () => authenticated,
    path: '/apps/studio',
    component: StudioRoute.options.component,
  })
  const workspace = createRoute({
    getParentRoute: () => authenticated,
    path: '/apps/workspace',
    component: WorkspaceRoute.options.component,
  })
  const workspaceNested = createRoute({
    getParentRoute: () => authenticated,
    path: '/apps/workspace/$',
    component: WorkspaceNestedRoute.options.component,
  })
  const signIn = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    component: () => <h1>Sign in</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([
      authenticated.addChildren([
        apps,
        chat,
        studio,
        workspace,
        workspaceNested,
      ]),
      signIn,
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  )
  return router
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  login(1)
  applicationsFail = false
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/ext/apps') {
      if (applicationsFail) {
        return { data: { success: false, message: 'Unavailable' } }
      }
      return {
        data: {
          success: true,
          data: [
            { id: 'chat', availability: 'available' },
            { id: 'studio', availability: 'preview' },
            { id: 'sites', availability: 'planned' },
          ],
        },
      }
    }
    throw new Error(`Unexpected endpoint: ${url}`)
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset('complete')
  vi.restoreAllMocks()
})

it('opens the standalone AI Chat entry, opens Studio in a new tab, and lists the planned website builder', async () => {
  const user = userEvent.setup()
  const router = await openWorkspace('/apps')
  const chatLink = await screen.findByRole('link', { name: 'Open Chat' })
  const studioLink = await screen.findByRole('link', { name: 'Open Studio' })
  expect(chatLink).toHaveAttribute('href', '/apps/chat')
  expect(studioLink).toHaveAttribute('href', '/apps/studio')
  expect(studioLink).toHaveAttribute('target', '_blank')
  expect(studioLink).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.getByRole('list', { name: 'Application Center' })).toBeVisible()
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByText('Multi-Model Intelligent Assistant')).toBeVisible()
  expect(screen.getByText('Image & Video Creation')).toBeVisible()
  expect(screen.getByText('Timeline Editing')).toBeVisible()
  expect(screen.getAllByText('Shared account & quota')).toHaveLength(2)
  expect(screen.getByText('AI Website Creation')).toBeVisible()
  expect(screen.getByText('In development')).toBeVisible()
  expect(screen.getByText('Coming soon')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled()
  expect(
    screen.queryByRole('link', { name: /Website Builder/ })
  ).not.toBeInTheDocument()
  await user.click(studioLink)
  expect(router.state.location.pathname).toBe('/apps')
  expect(document.querySelector('iframe')).not.toBeInTheDocument()

  await user.click(chatLink)
  expect(router.state.location.pathname).toBe('/apps/chat')
  expect(await screen.findByText('Loading...')).toBeVisible()
  expect(document.querySelector('iframe')).not.toBeInTheDocument()
})

it('reports an application catalog failure and recovers on retry', async () => {
  applicationsFail = true
  const user = userEvent.setup()
  await openWorkspace('/apps')
  const retry = await screen.findByRole('button', { name: 'Retry' })
  expect(
    screen.queryByRole('link', { name: 'Open Studio' })
  ).not.toBeInTheDocument()
  applicationsFail = false
  await user.click(retry)
  expect(await screen.findByRole('link', { name: 'Open Studio' })).toBeVisible()
})

it('loads the catalog after StrictMode cancels the initial request', async () => {
  vi.mocked(api.get).mockRestore()
  const originalAdapter = api.defaults.adapter
  api.defaults.adapter = async (config) => ({
    data: {
      success: true,
      data: [{ id: 'studio', availability: 'preview' }],
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
  try {
    await openWorkspace('/apps')
    expect(
      await screen.findByRole('link', { name: 'Open Studio' })
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument()
  } finally {
    api.defaults.adapter = originalAdapter
  }
})

it('redirects anonymous visitors to host login with the original destination', async () => {
  useAuthStore.getState().auth.reset('complete')
  const router = await openWorkspace('/apps')
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible()
  expect(router.state.location.search).toEqual({ redirect: '/apps' })
  expect(api.get).not.toHaveBeenCalled()
})

// Login uses client navigation: these destinations must reach the document bridge,
// even though the console does not own the standalone application's pages.
it.each([
  '/apps/workspace',
  '/apps/workspace/',
  '/apps/workspace/chat?conversation=saved',
])(
  'hands a logged-in return to %s to the standalone app instead of a console 404',
  async (destination) => {
    const router = await openWorkspace('/apps')
    await router.navigate({ href: destination, replace: true })
    expect(await screen.findByText('Loading...')).toBeVisible()
    expect(screen.queryByText('Not Found')).not.toBeInTheDocument()
    expect(router.state.location.href).toContain('/apps/workspace')
  }
)

it('keeps the standalone destination when an anonymous client navigation requires login', async () => {
  useAuthStore.getState().auth.reset('complete')
  const router = await openWorkspace('/apps/workspace/chat?conversation=saved')
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible()
  expect(router.state.location.search).toEqual({
    redirect: '/apps/workspace/chat?conversation=saved',
  })
})
