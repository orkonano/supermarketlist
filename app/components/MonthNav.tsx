"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Props = {
  month: number;
  year: number;
  listId: string;
  checked: number;
  total: number;
};

export default function MonthNav({ month, year, listId, checked, total }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function navigate(m: number, y: number) {
    startTransition(() => {
      router.push(`/lists/${listId}?month=${m}&year=${y}`);
    });
  }

  function prevMonth() {
    if (month === 1) navigate(12, year - 1);
    else navigate(month - 1, year);
  }

  function nextMonth() {
    if (month === 12) navigate(1, year + 1);
    else navigate(month + 1, year);
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-4">
      <button
        onClick={prevMonth}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        aria-label="Mes anterior"
      >
        &#8592;
      </button>
      <div className="text-center">
        <div className="text-xl font-semibold text-gray-900">
          {MONTHS[month - 1]} {year}
        </div>
        {total > 0 && (
          <div className="text-sm text-gray-400">
            {checked}/{total} productos marcados
          </div>
        )}
      </div>
      <button
        onClick={nextMonth}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        aria-label="Mes siguiente"
      >
        &#8594;
      </button>
    </div>
  );
}
