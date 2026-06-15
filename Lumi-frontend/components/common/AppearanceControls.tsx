import { CurrencySelector } from './CurrencySelector'
import { ThemeToggle } from './ThemeToggle'

interface AppearanceControlsProps {
  showCurrency?: boolean
  showTheme?: boolean
}

export function AppearanceControls({ showCurrency = true, showTheme = true }: AppearanceControlsProps) {
  return (
    <div className="appearance-controls" role="group" aria-label="Appearance settings">
      {showCurrency && <CurrencySelector />}
      {showTheme && <ThemeToggle />}
    </div>
  )
}
