export default function Link({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
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
