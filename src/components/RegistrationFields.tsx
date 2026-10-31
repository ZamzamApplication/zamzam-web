'use client'
import type { RegistrationField } from '@/lib/student-registration'

export default function RegistrationFields({
  fields,
  values,
  onChange,
}: {
  fields: RegistrationField[]
  values: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.id] || ''
        const props = {
          id: `registration-field-${field.id}`,
          className: 'surface-field rounded-xl px-3 py-2 w-full',
          required: field.is_required,
          value,
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
          ) => onChange({ ...values, [field.id]: event.target.value }),
        }
        return (
          <label
            key={field.id}
            htmlFor={props.id}
            className="block space-y-2 text-sm"
          >
            <span>
              {field.name}
              {field.is_required && ' *'}
            </span>
            {field.field_type === 'select' ||
            field.field_type === 'checkbox' ? (
              <select {...props}>
                <option value="">اختر</option>
                {(field.field_type === 'checkbox'
                  ? ['true', 'false']
                  : field.options
                ).map((option) => (
                  <option key={option} value={option}>
                    {option === 'true'
                      ? 'نعم'
                      : option === 'false'
                      ? 'لا'
                      : option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...props}
                type={field.field_type}
                step={field.field_type === 'number' ? 'any' : undefined}
                maxLength={field.field_type === 'text' ? 2000 : undefined}
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
