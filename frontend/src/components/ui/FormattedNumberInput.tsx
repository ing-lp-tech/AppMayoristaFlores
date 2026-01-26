import React, { useState, useEffect } from 'react';

interface FormattedNumberInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
}

export const FormattedNumberInput = ({ value, onChange, className = "", placeholder, prefix, suffix }: FormattedNumberInputProps) => {
    // Format helper: 1200.5 -> "1.200,5"
    const format = (val: number) => {
        if (!val && val !== 0) return '';
        return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(val);
    };

    const parse = (str: string) => {
        if (!str) return 0;
        // Remove dots (thousands), replace comma with dot (decimal)
        const clean = str.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    const [displayValue, setDisplayValue] = useState(() => {
        // Initialize displayValue based on the initial 'value' prop
        return value === 0 ? '' : format(value);
    });

    // Sync from prop to state when value changes externally (and strictly doesn't match current parse)
    useEffect(() => {
        // Only update if the numeric value of current display is different from prop value
        // or if display is empty and value is 0 (to avoid clearing user input of "0,")
        const currentParsed = parse(displayValue);
        if (currentParsed !== value) {
            // Special case: typing "1," -> parsed is 1. value is 1. Don't overwrite "1," with "1".
            // We can't easily detect "typing" vs "external update".
            // Simplified: Always sync if values mismatch.
            // If they match, keep displayValue (allows "1,0" or "1,").

            // Handle 0: if value is 0, we might want empty or "0".
            if (value === 0) {
                if (displayValue !== '' && displayValue !== '0' && displayValue !== '0,') {
                    setDisplayValue('');
                }
            } else {
                setDisplayValue(format(value));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;

        // Allow: digits, one comma. Remove dots (they are just decoration, user shouldn't type them usually but if they delete one?)
        // Actually, if user types dots, we can ignore them.
        // Regex: Allow 0-9 and ,

        // Count commas
        const commas = raw.match(/,/g)?.length || 0;
        if (commas > 1) return; // Prevent multiple commas

        // Filter invalid chars
        const valid = raw.replace(/[^0-9,]/g, '');

        setDisplayValue(valid);
        onChange(parse(valid));
    };

    const handleBlur = () => {
        // On blur, re-format nicely
        if (value !== 0) {
            setDisplayValue(format(value));
        } else {
            setDisplayValue('');
        }
    };

    return (
        <div className="relative">
            {prefix && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-black z-10">
                    {prefix}
                </div>
            )}
            <input
                type="text"
                className={`${className} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-8' : ''} `}
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder || "0"}
            />
            {suffix && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-black z-10">
                    {suffix}
                </div>
            )}
        </div>
    );
};
