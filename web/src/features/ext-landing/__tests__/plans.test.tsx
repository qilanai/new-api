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
import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Plans } from '../components/plans'

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { to: string; children?: ReactNode; className?: string }) => (
    <a href={props.to} className={props.className}>
      {props.children}
    </a>
  ),
}))

function planCard(name: string): HTMLElement {
  const card = screen
    .getAllByTestId('plan-card')
    .find((el) => el.querySelector('h3')?.textContent === name)
  if (!card) throw new Error(`${name} card not rendered`)
  return card
}

describe('landing plans', () => {
  it('renders Go, Plus and Pro with their monthly USD prices', () => {
    render(<Plans />)

    expect(screen.getAllByTestId('plan-card')).toHaveLength(3)
    expect(within(planCard('ChatGPT Go')).getByText('US$8')).toBeInTheDocument()
    expect(
      within(planCard('ChatGPT Plus')).getByText('US$20')
    ).toBeInTheDocument()
    expect(
      within(planCard('ChatGPT Pro')).getByText('US$100')
    ).toBeInTheDocument()
    expect(screen.getAllByText('/ month')).toHaveLength(3)
  })

  it('shows the starting-price note on Pro only', () => {
    render(<Plans />)

    expect(
      within(planCard('ChatGPT Pro')).getByText('Starting at')
    ).toBeInTheDocument()
    expect(
      within(planCard('ChatGPT Go')).queryByText('Starting at')
    ).not.toBeInTheDocument()
    expect(
      within(planCard('ChatGPT Plus')).queryByText('Starting at')
    ).not.toBeInTheDocument()
  })

  it('lists the inherited lead-in and every feature of each tier', () => {
    render(<Plans />)

    const pro = planCard('ChatGPT Pro')
    expect(
      within(pro).getByText('Everything in Plus, and:')
    ).toBeInTheDocument()
    expect(within(pro).getAllByRole('listitem')).toHaveLength(9)
    expect(
      within(planCard('ChatGPT Go')).getAllByRole('listitem')
    ).toHaveLength(5)
    expect(
      within(planCard('ChatGPT Plus')).getAllByRole('listitem')
    ).toHaveLength(9)
  })

  it('links every tier to the wallet page where plans are purchased', () => {
    render(<Plans />)

    for (const name of ['Get Go', 'Get Plus', 'Get Pro']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        '/wallet'
      )
    }
  })
})
