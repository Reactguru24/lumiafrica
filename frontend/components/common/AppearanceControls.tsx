// import { CurrencySelector } from './CurrencySelector'
import { ThemeToggle } from './ThemeToggle'

interface AppearanceControlsProps {
  showCurrency?: boolean
  showTheme?: boolean
}

export function AppearanceControls({ showCurrency: _showCurrency = false, showTheme = true }: AppearanceControlsProps) {
  return (
    <div className="appearance-controls" role="group" aria-label="Appearance settings">
      {/* Currency fixed to KES — selector disabled for now
      {showCurrency && <CurrencySelector />}
      */}
      {showTheme && <ThemeToggle />}
    </div>
  )
}
