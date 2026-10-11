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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SectionMoreLink {
  label: string
  /** Internal route; takes precedence over href. */
  to?: string
  /** External page, opened in a new tab. */
  href?: string
}

interface SectionHeadProps {
  title: string
  subtitle?: string
  more?: SectionMoreLink
  /** Rendered instead of the "more" link, e.g. a toggle. */
  aside?: ReactNode
  className?: string
}

const MORE_CLASS =
  'text-primary hover:text-primary/80 inline-flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap hover:underline hover:underline-offset-4'

function MoreLink(props: { link: SectionMoreLink }) {
  const link = props.link
  const content = (
    <>
      {link.label}
      <ArrowRight className='size-3.5' />
    </>
  )
  if (link.to) {
    return (
      <Link to={link.to} className={MORE_CLASS}>
        {content}
      </Link>
    )
  }
  return (
    <a
      href={link.href}
      target='_blank'
      rel='noopener noreferrer'
      className={MORE_CLASS}
    >
      {content}
    </a>
  )
}

/** Aliyun-style block header: left-aligned title + one-line subtitle, "all …" link on the right. */
export function SectionHead(props: SectionHeadProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6',
        props.className
      )}
    >
      <div className='min-w-0'>
        <h2 className='text-2xl font-semibold tracking-tight text-balance md:text-[26px]'>
          {props.title}
        </h2>
        {props.subtitle ? (
          <p className='text-muted-foreground mt-2 text-[15px]'>
            {props.subtitle}
          </p>
        ) : null}
      </div>
      {props.aside ? props.aside : null}
      {!props.aside && props.more ? <MoreLink link={props.more} /> : null}
    </div>
  )
}
