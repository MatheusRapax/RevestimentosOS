import * as React from "react"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface MonthYearPickerProps {
    date: Date
    onDateChange: (date: Date) => void
}

const months = [
    { value: 0, label: "Janeiro" },
    { value: 1, label: "Fevereiro" },
    { value: 2, label: "Março" },
    { value: 3, label: "Abril" },
    { value: 4, label: "Maio" },
    { value: 5, label: "Junho" },
    { value: 6, label: "Julho" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Setembro" },
    { value: 9, label: "Outubro" },
    { value: 10, label: "Novembro" },
    { value: 11, label: "Dezembro" },
]

export function MonthYearPicker({ date, onDateChange }: MonthYearPickerProps) {
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i + 1).sort((a, b) => b - a) // Current year + 1 down to -3 years

    const handleMonthChange = (monthStr: string) => {
        const newDate = new Date(date)
        newDate.setMonth(parseInt(monthStr))
        onDateChange(newDate)
    }

    const handleYearChange = (yearStr: string) => {
        const newDate = new Date(date)
        newDate.setFullYear(parseInt(yearStr))
        onDateChange(newDate)
    }

    return (
        <div className="flex items-center gap-2">
            <Select value={date.getMonth().toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[130px] bg-white">
                    <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {months.map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                                {month.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>

            <Select value={date.getFullYear().toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[100px] bg-white">
                    <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}
