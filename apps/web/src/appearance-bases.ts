/** Complete surface ramps. Base and accent are independent presentation choices. */
export const bases = [
  {
    id: 'kabut',
    name: 'Kabut',
    light: ['#e8eae4', '#fbfbf8', '#eceee7', '#d6dbd2', '#1a211e', '#5a635e'],
    dark: ['#0e1110', '#161a18', '#202522', '#2d332f', '#eef1ec', '#a4ada7'],
  },
  {
    id: 'graphite',
    name: 'Grafit',
    light: ['#fafafa', '#ffffff', '#f2f2f2', '#e5e5e5', '#171717', '#666666'],
    dark: ['#0a0a0a', '#171717', '#242424', '#303030', '#f5f5f5', '#a1a1a1'],
  },
  {
    id: 'paper',
    name: 'Kertas',
    light: ['#f1eee8', '#faf8f2', '#eeeae2', '#dcd7cd', '#24221e', '#69645b'],
    dark: ['#12110f', '#1b1916', '#292620', '#3a352c', '#f4f0e8', '#b0a99c'],
  },
  {
    id: 'stone',
    name: 'Batu',
    light: ['#eeefec', '#fafbf8', '#e9ece6', '#d6dbd2', '#20241e', '#626a5c'],
    dark: ['#10120f', '#191c17', '#262a23', '#343a30', '#edf2e9', '#a6b29e'],
  },
  {
    id: 'ink',
    name: 'Tinta',
    light: ['#edf0f4', '#fafbfd', '#e8ecf2', '#d7dfe9', '#1c2532', '#5d6b7d'],
    dark: ['#0c1015', '#151b23', '#222a35', '#303b49', '#edf2f9', '#a2afc1'],
  },
] as const
export function baseRoles(id: string, dark: boolean) {
  const base = bases.find((b) => b.id === id) ?? bases[0]
  const [ground, surface, raised, border, ink, muted] = dark
    ? base.dark
    : base.light
  return {
    '--page-ground': ground,
    '--reading-surface': surface,
    '--reading-line': border,
    '--background': surface,
    '--foreground': ink,
    '--card': surface,
    '--popover': surface,
    '--secondary': raised,
    '--muted': raised,
    '--muted-foreground': muted,
    '--border': border,
    '--input': border,
    '--sidebar': ground,
  }
}
