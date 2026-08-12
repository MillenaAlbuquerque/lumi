import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { cn } from '../../lib/utils'

type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return <DayPicker
    showOutsideDays={showOutsideDays}
    locale={ptBR}
    className={cn('p-1', className)}
    classNames={{
      months: 'flex flex-col',
      month: 'space-y-4',
      month_caption: 'relative flex h-8 items-center justify-center',
      caption_label: 'text-sm font-medium capitalize',
      nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
      button_previous: 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white',
      button_next: 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white',
      month_grid: 'w-full border-collapse space-y-1',
      weekdays: 'flex',
      weekday: 'w-9 text-center text-xs font-normal text-white/40',
      week: 'mt-2 flex w-full',
      day: 'relative h-9 w-9 p-0 text-center text-sm',
      day_button: 'h-9 w-9 rounded-lg font-normal text-white transition hover:bg-white/10',
      selected: '[&>button]:bg-[var(--color-primary-dark)] [&>button]:text-white [&>button]:hover:bg-[var(--color-primary-dark)]',
      today: '[&>button]:border [&>button]:border-[var(--color-primary-dark)] [&>button]:text-[var(--color-primary-dark)]',
      outside: 'opacity-30',
      disabled: 'opacity-20',
      hidden: 'invisible',
      ...classNames,
    }}
    components={{
      Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
    }}
    {...props}
  />
}

export { Calendar }
