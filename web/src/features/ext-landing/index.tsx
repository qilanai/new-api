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
import './landing.css'
import { Cta } from './components/cta'
import { Ecosystem } from './components/ecosystem'
import { Features } from './components/features'
import { Hero } from './components/hero'
import { Models } from './components/models'
import { Plans } from './components/plans'
import { Promos } from './components/promos'
import { QuickStart } from './components/quickstart'
import { Service } from './components/service'
import { Solutions } from './components/solutions'
import { Stats } from './components/stats'

interface LandingProps {
  isAuthenticated: boolean
}

/**
 * Elink Nexus marketing home (fork extension). Rendered by the upstream Home
 * component in place of its default sections; the public header and footer
 * stay upstream.
 */
export function Landing(props: LandingProps) {
  return (
    <div className='bg-background text-foreground w-full'>
      <Hero isAuthenticated={props.isAuthenticated} />
      <Stats />
      <Models />
      <Plans />
      <Features />
      <Solutions />
      <Ecosystem />
      <Promos />
      <QuickStart />
      <Service />
      <Cta isAuthenticated={props.isAuthenticated} />
    </div>
  )
}
