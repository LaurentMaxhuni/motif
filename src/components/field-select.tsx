import type { ComponentProps, ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Props = Omit<ComponentProps<typeof SelectTrigger>, 'value' | 'onChange' | 'children'> & {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  name?: string
  placeholder?: string
  required?: boolean
}

export function FieldSelect({ value, onValueChange, children, name, disabled, required, placeholder='Choose an option', className, ...triggerProps }: Props) {
  return <Select value={value} onValueChange={onValueChange} name={name} disabled={disabled} required={required}>
    <SelectTrigger {...triggerProps} className={cn('max-w-full', className)}><SelectValue placeholder={placeholder}/></SelectTrigger>
    <SelectContent position="popper" align="start" className="max-h-72 min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">{children}</SelectContent>
  </Select>
}

export function FieldSelectItem({ value, children, ...props }: Omit<ComponentProps<typeof SelectItem>, 'value'> & { value?: string | number }) {
  const itemValue = String(value ?? children)
  return itemValue ? <SelectItem {...props} value={itemValue}>{children}</SelectItem> : null
}
