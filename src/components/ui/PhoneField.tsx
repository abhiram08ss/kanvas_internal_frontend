import { useMemo, type ComponentType, type SVGProps } from 'react'
import { Input, Select } from 'antd'
import countries from 'i18n-iso-countries'
import en from 'i18n-iso-countries/langs/en.json'
import * as Flags from 'country-flag-icons/react/3x2'
import { getCountries, type CountryCode } from 'libphonenumber-js/min'
import { dialCode, type PhoneParts } from '../../utils/phone'

countries.registerLocale(en)
const FLAGS = Flags as unknown as Record<string, ComponentType<SVGProps<SVGSVGElement>> | undefined>
const POPULAR: CountryCode[] = ['IN', 'US', 'GB', 'AE', 'SG', 'AU', 'CA', 'DE']

function Flag({ code }: { code: string }) {
  const Icon = FLAGS[code]
  return Icon ? <Icon className="country-flag" aria-hidden="true" /> : <span className="country-flag is-empty" />
}

/**
 * Contact number: a searchable country-code dropdown (flag + dial code) next to the number box.
 * `value` holds the country and the digits typed after the code; the parent decides how to store it.
 */
export function PhoneField({
  value,
  onChange,
  onBlur,
  status,
  placeholder = 'Enter mobile number',
}: {
  value: PhoneParts
  onChange: (next: PhoneParts) => void
  onBlur?: () => void
  status?: 'error'
  placeholder?: string
}) {
  const options = useMemo(() => {
    const all = getCountries()
      .map((code) => ({ code, name: countries.getName(code, 'en') ?? code, dial: dialCode(code) }))
      .sort((a, b) => a.name.localeCompare(b.name))
    const popular = POPULAR.map((c) => all.find((o) => o.code === c)).filter((o): o is NonNullable<typeof o> => !!o)
    return [...popular, ...all.filter((o) => !POPULAR.includes(o.code))]
  }, [])

  return (
    <div className="phone-field">
      <Select
        showSearch
        className="phone-dial"
        popupMatchSelectWidth={300}
        value={value.country}
        onChange={(country: CountryCode) => onChange({ ...value, country })}
        onBlur={onBlur}
        status={status}
        optionFilterProp="search"
        options={options.map((o) => ({ value: o.code, label: `${o.dial}`, search: `${o.name} ${o.dial} ${o.code}`, name: o.name, dial: o.dial, code: o.code }))}
        optionRender={(opt) => {
          const d = opt.data as { name: string; dial: string; code: string }
          return (
            <span className="country-opt">
              <Flag code={d.code} />
              <span style={{ flex: 1 }}>{d.name}</span>
              <span style={{ color: '#7a6f94' }}>{d.dial}</span>
            </span>
          )
        }}
        labelRender={(opt) => (
          <span className="country-opt">
            <Flag code={String(opt.value)} />
            <span>{dialCode(opt.value as CountryCode)}</span>
          </span>
        )}
      />
      <Input
        inputMode="tel"
        maxLength={15}
        value={value.national}
        status={status}
        onChange={(e) => onChange({ ...value, national: e.target.value.replace(/\D/g, '') })}
        onBlur={onBlur}
        placeholder={placeholder}
      />
    </div>
  )
}
