interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}

export default function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange} disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 disabled:opacity-50 ${checked ? 'bg-accent' : 'bg-bg-tertiary'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}
