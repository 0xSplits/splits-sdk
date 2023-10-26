import React from 'react'

interface LinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

const Link: React.FC<LinkProps> = ({ href, children, className }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover:underline ${className}`}
    >
      {children}
    </a>
  )
}

export default Link
