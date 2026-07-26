import { Field, FieldLabel, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
import { Slider } from '#/components/ui/slider'

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  children?: React.ReactNode
}

export function FormField({ label, description, error, required, children }: FormFieldProps) {
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel>
        {label}
        {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

export function FormInput({ label, description, error, required, value, onChange, placeholder, type }: FormFieldProps & {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <FormField label={label} description={description} error={error} required={required}>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        aria-invalid={!!error || undefined}
        data-invalid={!!error || undefined}
      />
    </FormField>
  )
}

export function FormTextarea({ label, description, error, required, value, onChange, placeholder }: FormFieldProps & {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <FormField label={label} description={description} error={error} required={required}>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        data-invalid={!!error || undefined}
      />
    </FormField>
  )
}

export function FormSelect({ label, description, error, required, value, onChange, options }: FormFieldProps & {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <FormField label={label} description={description} error={error} required={required}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        data-invalid={!!error || undefined}
        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </FormField>
  )
}

export function FormSwitch({ label, description, error, required, checked, onChange }: FormFieldProps & {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <FormField label={label} description={description} error={error} required={required}>
      <Switch checked={checked} onCheckedChange={onChange} />
    </FormField>
  )
}

export function FormSlider({ label, description, error, required, value, onChange, min, max, step }: FormFieldProps & {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <FormField label={label} description={description} error={error} required={required}>
      <div className="flex items-center gap-3">
        <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1" />
        <span className="text-sm text-muted-foreground w-10 text-right">{value}</span>
      </div>
    </FormField>
  )
}
