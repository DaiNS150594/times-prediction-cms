'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from 'react';

type NiceSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export default function NiceSelect({
  children,
  value,
  defaultValue,
  onChange,
  className = '',
  disabled,
}: NiceSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''));

  const options = useMemo(
    () =>
      Children.toArray(children)
        .filter(isValidElement)
        .map((child: any) => ({
          value: String(child.props.value ?? ''),
          label: child.props.children,
          disabled: Boolean(child.props.disabled),
        })),
    [children]
  );

  const selectedValue = value !== undefined ? String(value) : internalValue;
  const selectedOption =
    options.find((option) => option.value === selectedValue) || options[0];

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function selectOption(nextValue: string) {
    const option = options.find((item) => item.value === nextValue);
    if (!option || option.disabled || disabled) return;

    if (value === undefined) {
      setInternalValue(nextValue);
    }

    setOpen(false);

    const changeEvent = {
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as unknown as ChangeEvent<HTMLSelectElement>;

    onChange?.(changeEvent);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => !current);
      return;
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = options.findIndex((option) => option.value === selectedValue);
      const next = options.slice(currentIndex + 1).find((option) => !option.disabled);
      if (next) selectOption(next.value);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = options.findIndex((option) => option.value === selectedValue);
      const previous = options
        .slice(0, currentIndex)
        .reverse()
        .find((option) => !option.disabled);
      if (previous) selectOption(previous.value);
    }
  }

  return (
    <div ref={rootRef} className="nice-select-root">
      <div
        className={`nice-select input ${open ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="current">{selectedOption?.label || ''}</span>

        {open && !disabled && (
          <ul className="list" role="listbox">
            {options.map((option) => (
              <li
                key={option.value}
                className={`option ${option.value === selectedValue ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}`}
                role="option"
                aria-selected={option.value === selectedValue}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option.value);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
