import Link from 'next/link'
import Image from 'next/image'

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  light?: boolean
  className?: string
}

export function AppLogo({ size = 'md', light = false, className = '' }: AppLogoProps) {
  const heightClass = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-14' : 'h-10'
  const textSizeClass = size === 'lg' ? 'text-2xl' : 'text-lg'

  return (
    <Link href="/" className={`flex items-center gap-2 shrink-0 ${light ? 'text-white' : ''} ${className}`}>
      <Image
        src="/logo.png"
        alt="LumiAfrica"
        width={size === 'lg' ? 56 : size === 'sm' ? 32 : 40}
        height={size === 'lg' ? 56 : size === 'sm' ? 32 : 40}
        className={`object-contain ${heightClass} w-auto`}
      />
      {size !== 'sm' && (
        <span
          className={`font-display font-semibold tracking-tight hidden sm:block ${textSizeClass} ${
            light ? 'text-white' : 'text-brand-teal dark:text-white'
          }`}
        >
          LumiAfrica
        </span>
      )}
    </Link>
  )
}
