'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface AnimateOnScrollProps {
  children: ReactNode
  className?: string
  /** Apply stagger-N class (1–6) for delayed reveal within a group */
  stagger?: number
  threshold?: number
}

export default function AnimateOnScroll({
  children,
  className = '',
  stagger,
  threshold = 0.12,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('anim-visible')
          observer.unobserve(el)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const staggerClass = stagger ? `anim-stagger-${stagger}` : ''

  return (
    <div ref={ref} className={`anim-hidden ${staggerClass} ${className}`}>
      {children}
    </div>
  )
}
