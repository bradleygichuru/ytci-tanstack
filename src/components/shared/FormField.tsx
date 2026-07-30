import { useId } from 'react'
import { format, parse } from 'date-fns'
import { Calendar as CalendarIcon } from '@phosphor-icons/react'
import { Field, FieldLabel, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
import { Slider } from '#/components/ui/slider'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '#/components/ui/popover'
import { cn } from '#/lib/utils'

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  id?: string
  children?: React.ReactNode
}

export function FormField({ label, description, error, required, id, children }: FormFieldProps) {
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>
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
  const id = useId()
  return (
    <FormField label={label} description={description} error={error} required={required} id={id}>
      <Input
        id={id}
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
  const id = useId()
  return (
    <FormField label={label} description={description} error={error} required={required} id={id}>
      <Textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        data-invalid={!!error || undefined}
      />
    </FormField>
  )
}

export type SelectOption = string | { value: string; label: string }

export function FormSelect({ label, description, error, required, value, onChange, options }: FormFieldProps & {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
}) {
  const id = useId()
  return (
    <FormField label={label} description={description} error={error} required={required} id={id}>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        data-invalid={!!error || undefined}
        className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
      >
        <option value="">Select...</option>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </FormField>
  )
}

export function FormSwitch({ label, description, error, required, checked, onChange }: FormFieldProps & {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = useId()
  return (
    <FormField label={label} description={description} error={error} required={required} id={id}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
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
  const id = useId()
  return (
    <FormField label={label} description={description} error={error} required={required} id={id}>
      <div className="flex items-center gap-3">
        <Slider id={id} value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1" />
        <span className="text-sm text-muted-foreground w-10 text-right">{value}</span>
      </div>
    </FormField>
  )
}

export function FormDatePicker({ label, description, error, required, value, onChange }: FormFieldProps & {
  value: string
  onChange: (v: string) => void
}) {
  const id = useId()
  const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  return (
    <FormField label={label} description={description} error={error} required={required} id={id}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
            aria-invalid={!!error || undefined}
            data-invalid={!!error || undefined}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  )
}
