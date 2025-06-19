import { CheckCircleIcon } from '@heroicons/react/24/solid';

type Placeholder = {
  id: string;
  type: 'placeholder';
};

type Props = {
  placeholder: Placeholder;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
};

export default function PlaceholderCard({ placeholder, isSelected, onToggleSelect }: Props) {
  return (
    <div
      onClick={() => onToggleSelect(placeholder.id)}
      className={`relative flex flex-col items-center justify-center aspect-[5/7] bg-gray-100 dark:bg-gray-800/50 rounded-lg border-2 border-dashed transition-colors duration-200 cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
    >
      <div className="text-gray-400 dark:text-gray-500 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <p className="mt-2 font-semibold">空き枠</p>
        <p className="text-xs">選択して再抽選</p>
      </div>
      {isSelected && (
        <CheckCircleIcon className="absolute top-2 right-2 h-6 w-6 text-indigo-600" />
      )}
    </div>
  );
}