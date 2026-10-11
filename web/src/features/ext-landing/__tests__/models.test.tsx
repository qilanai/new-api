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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Models } from '../components/models'

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { to: string; children?: ReactNode; className?: string }) => (
    <a href={props.to} className={props.className}>
      {props.children}
    </a>
  ),
}))

describe('landing model plaza', () => {
  it('shows every general model under the default tab and filters by vendor on click', async () => {
    const user = userEvent.setup()
    render(<Models />)

    expect(screen.getAllByTestId('model-card')).toHaveLength(6)
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'true'
    )

    await user.click(screen.getByRole('tab', { name: 'Anthropic' }))

    const cards = screen.getAllByTestId('model-card')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('Claude series')
    expect(screen.getByRole('tab', { name: 'Anthropic' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('lists media models only under the image and speech tab', async () => {
    const user = userEvent.setup()
    render(<Models />)

    await user.click(screen.getByRole('tab', { name: 'Image & speech' }))

    const names = screen
      .getAllByTestId('model-card')
      .map((card) => card.querySelector('h3')?.textContent)
    expect(names).toEqual([
      'Text-to-image · Image-to-image',
      'TTS · Speech recognition',
      'Video & audio understanding',
    ])
  })
})
