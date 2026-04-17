import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface DatePickerProps {
  selectedDate: string;
  onSelect: (date: string) => void;
}

export const CustomDatePicker = ({ selectedDate, onSelect }: DatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4 px-2">
      <span className="text-sm font-bold capitalize">
        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
      </span>
      <div className="flex gap-2">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((d) => (
          <div key={d} className="text-[10px] text-center font-bold text-zinc-400 uppercase">
            {d}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'yyyy-MM-dd');
        const isSelected = selectedDate === formattedDate;
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <button
            key={day.toString()}
            onClick={() => onSelect(formattedDate)}
            className={`h-9 w-full flex items-center justify-center text-sm rounded-lg transition-all ${
              isSelected 
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold' 
                : !isCurrentMonth 
                  ? 'text-zinc-300 dark:text-zinc-700' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            {format(day, 'd')}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={day.toString()} className="grid grid-cols-7">{days}</div>);
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="p-2 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};