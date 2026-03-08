import React from 'react'

type Props = {
  label?: string
  value: string
  onChange: (e: any) => void
  type?: string
  id?: string
  placeholder?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'id' | 'placeholder'>

export default function FancyInput({ label, value, onChange, type = 'text', id, placeholder, ...rest }: Props) {
  return (
    <div className="mb-4">
      {label && <label htmlFor={id} className="block text-sm mb-2">{label}</label>}
      <div className="fancy-input relative">
        <input id={id} placeholder={placeholder} value={value} onChange={onChange} type={type} {...rest}
          className="w-full bg-transparent border-0 p-0 text-white placeholder:opacity-60" />
      </div>
      <div className={`fancy-underline mt-2 ${value ? 'active' : ''}`} />
    </div>
  )
}
