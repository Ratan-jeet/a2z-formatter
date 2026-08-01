function splitWords(input) {
  const text = String(input ?? '')
  if (!text.trim()) return []
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export const CASE_MODES = [
  { id: 'lower', label: 'lowercase' },
  { id: 'upper', label: 'UPPERCASE' },
  { id: 'title', label: 'Title Case' },
  { id: 'sentence', label: 'Sentence case' },
  { id: 'camel', label: 'camelCase' },
  { id: 'pascal', label: 'PascalCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'constant', label: 'CONSTANT_CASE' },
  { id: 'kebab', label: 'kebab-case' },
  { id: 'train', label: 'Train-Case' },
  { id: 'dot', label: 'dot.case' },
  { id: 'path', label: 'path/case' },
  { id: 'alternating', label: 'aLtErNaTiNg' },
  { id: 'inverse', label: 'InVeRsE cAsE' },
]

export function convertCase(input, mode) {
  const text = String(input ?? '')
  if (!text) return ''

  const words = splitWords(text)
  const lowerWords = words.map((w) => w.toLowerCase())

  switch (mode) {
    case 'lower':
      return text.toLowerCase()
    case 'upper':
      return text.toUpperCase()
    case 'title':
      return lowerWords.map(capitalize).join(' ')
    case 'sentence': {
      const joined = lowerWords.join(' ')
      return joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : ''
    }
    case 'camel':
      return lowerWords
        .map((w, i) => (i === 0 ? w : capitalize(w)))
        .join('')
    case 'pascal':
      return lowerWords.map(capitalize).join('')
    case 'snake':
      return lowerWords.join('_')
    case 'constant':
      return lowerWords.map((w) => w.toUpperCase()).join('_')
    case 'kebab':
      return lowerWords.join('-')
    case 'train':
      return lowerWords.map(capitalize).join('-')
    case 'dot':
      return lowerWords.join('.')
    case 'path':
      return lowerWords.join('/')
    case 'alternating':
      return [...text]
        .map((ch, i) => (i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase()))
        .join('')
    case 'inverse':
      return [...text]
        .map((ch) => {
          if (ch >= 'a' && ch <= 'z') return ch.toUpperCase()
          if (ch >= 'A' && ch <= 'Z') return ch.toLowerCase()
          return ch
        })
        .join('')
    default:
      return text
  }
}

export function convertAllCases(input) {
  const out = {}
  CASE_MODES.forEach((mode) => {
    out[mode.id] = convertCase(input, mode.id)
  })
  return out
}
