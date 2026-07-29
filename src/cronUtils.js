import cronstrue from 'cronstrue'

export const CRON_SAMPLES = [
  '0 9 * * 1-5',
  '*/15 * * * *',
  '0 0 1 * *',
  '30 18 * * 0',
  '0 */6 * * *',
]

export function explainCron(expression, { use24Hour = true } = {}) {
  const trimmed = expression.trim()
  if (!trimmed) throw new Error('Cron expression is empty')

  try {
    const description = cronstrue.toString(trimmed, {
      throwExceptionOnParseError: true,
      use24HourTimeFormat: use24Hour,
      verbose: true,
    })
    const parts = trimmed.split(/\s+/)
    return {
      expression: trimmed,
      description,
      fields:
        parts.length >= 5
          ? {
              minute: parts[0],
              hour: parts[1],
              dayOfMonth: parts[2],
              month: parts[3],
              dayOfWeek: parts[4],
              ...(parts[5] ? { year: parts[5] } : {}),
            }
          : null,
    }
  } catch (err) {
    throw new Error(err.message || 'Invalid cron expression')
  }
}
