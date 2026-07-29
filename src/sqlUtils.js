import { format } from 'sql-formatter'

export const SQL_SAMPLE = `select u.id,u.name,count(o.id) as order_count from users u left join orders o on o.user_id=u.id where u.active=1 group by u.id,u.name order by order_count desc;`

export function formatSql(raw, indent = 2) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')
  try {
    return format(trimmed, {
      language: 'sql',
      tabWidth: Number(indent) || 2,
      keywordCase: 'upper',
      linesBetweenQueries: 1,
    })
  } catch (err) {
    throw new Error(err.message || 'Could not format SQL')
  }
}

export function minifySql(raw) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Input is empty')
  return trimmed.replace(/\s+/g, ' ').trim()
}
