export const toolAreaOptions = [
  { value: 'Fundraising', label: 'Fundraising' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Market research', label: 'Market research' },
  { value: 'Sales & marketing', label: 'Sales & marketing' },
  { value: 'Strategy', label: 'Strategy' },
  { value: 'Legal & compliance', label: 'Legal & compliance' },
  { value: 'People & hiring', label: 'People & hiring' },
  { value: 'Product & technology', label: 'Product & technology' },
  { value: 'Impact reporting', label: 'Impact reporting' },
] as const;

export type ToolArea = (typeof toolAreaOptions)[number]['value'];
