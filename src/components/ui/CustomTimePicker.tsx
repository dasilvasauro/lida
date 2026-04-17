import { motion } from 'framer-motion';

interface TimePickerProps {
  selectedTime: string;
  onSelect: (time: string) => void;
}

export const CustomTimePicker = ({ selectedTime, onSelect }: TimePickerProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const currentHour = selectedTime.split(':')[0] || '12';
  const currentMin = selectedTime.split(':')[1] || '00';

  return (
    <div className="flex gap-4 p-4 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex-1 h-32 overflow-y-auto scrollbar-hide space-y-1">
        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-2 text-center">Hora</span>
        {hours.map((h) => (
          <button
            key={h}
            onClick={() => onSelect(`${h}:${currentMin}`)}
            className={`w-full py-1 rounded-md text-sm ${currentHour === h ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
          >
            {h}h
          </button>
        ))}
      </div>
      <div className="flex-1 h-32 overflow-y-auto scrollbar-hide space-y-1">
        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-2 text-center">Min</span>
        {minutes.map((m) => (
          <button
            key={m}
            onClick={() => onSelect(`${currentHour}:${m}`)}
            className={`w-full py-1 rounded-md text-sm ${currentMin === m ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-bold' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
};