import { useMemo, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { Select } from 'antd'
import countries from 'i18n-iso-countries'
import en from 'i18n-iso-countries/langs/en.json'
import * as Flags from 'country-flag-icons/react/3x2'

countries.registerLocale(en)

const FLAGS = Flags as unknown as Record<string, ComponentType<SVGProps<SVGSVGElement>> | undefined>

/** Most-used countries are listed first; everything else follows alphabetically. */
const POPULAR = ['IN', 'US', 'GB', 'AE', 'SG', 'AU', 'CA', 'DE']

interface Option {
  value: string // the country name, which is what the backend stores
  label: string
  code: string
}

const ALL: Option[] = Object.entries(countries.getNames('en', { select: 'official' }))
  .map(([code, name]) => ({ code, value: name, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label))

function Flag({ code }: { code: string }) {
  const Icon = FLAGS[code]
  return Icon ? <Icon className="country-flag" aria-hidden="true" /> : <span className="country-flag is-empty" />
}

const optionLabel = (o: Option) => (
  <span className="country-opt">
    <Flag code={o.code} />
    <span>{o.label}</span>
  </span>
)

/**
 * Searchable country dropdown with flags (i18n-iso-countries for the names, country-flag-icons for the flags).
 * The value is the English country name. A country saved earlier under a different spelling is kept as an extra
 * option, so editing an old record never loses it.
 */
export function CountrySelect({
  value,
  onChange,
  onBlur,
  status,
  size,
  placeholder = 'Select country',
}: {
  value?: string
  onChange: (country: string) => void
  onBlur?: () => void
  status?: 'error'
  size?: 'large' | 'middle'
  placeholder?: string
}) {
  const options = useMemo(() => {
    const popular = POPULAR.map((c) => ALL.find((o) => o.code === c)).filter((o): o is Option => !!o)
    const rest = ALL.filter((o) => !POPULAR.includes(o.code))
    const list = [...popular, ...rest]
    if (value && !list.some((o) => o.value === value)) {
      list.push({ value, label: value, code: countries.getAlpha2Code(value, 'en') ?? '' })
    }
    return list
  }, [value])

  return (
    <Select
      showSearch
      size={size}
      status={status}
      value={value || undefined}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      optionFilterProp="label"
      style={{ width: '100%' }}
      options={options.map((o) => ({ value: o.value, label: o.label, option: optionLabel(o) }))}
      optionRender={(opt) => (opt.data as { option: ReactNode }).option}
      labelRender={(opt) => {
        const o = options.find((x) => x.value === opt.value)
        return o ? optionLabel(o) : opt.label
      }}
    />
  )
}
