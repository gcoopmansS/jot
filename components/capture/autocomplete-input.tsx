"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Custom autocomplete input that clearly shows:
 * - Existing options you can select
 * - "Create new: [name]" when typing something that doesn't exist
 *
 * Much clearer than native datalist which varies by browser/OS.
 */

type AutocompleteOption = {
  id: string;
  name: string;
};

type AutocompleteInputProps = {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder: string;
  label: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  label,
  disabled = false,
  onFocus,
  onBlur,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on current input
  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(value.toLowerCase()),
  );

  // Check if current value exactly matches an existing option
  const exactMatch = options.find(
    (opt) => opt.name.toLowerCase() === value.toLowerCase(),
  );

  // Show "Create new" option if there's input and no exact match
  const showCreateNew = value.trim() && !exactMatch;

  // Build the final list shown in dropdown
  const dropdownItems = showCreateNew
    ? [{ id: "__create__", name: value.trim() }, ...filteredOptions]
    : filteredOptions;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0); // Reset highlight when typing
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    onFocus?.();
  };

  const handleInputBlur = () => {
    onBlur?.();
  };

  const selectOption = (optionName: string) => {
    onChange(optionName);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < dropdownItems.length - 1 ? prev + 1 : prev,
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;

      case "Enter":
        e.preventDefault();
        if (dropdownItems[highlightedIndex]) {
          selectOption(dropdownItems[highlightedIndex].name);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;

      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="flex flex-col gap-1 relative">
      <label
        className="text-xs uppercase tracking-wide font-medium"
        style={{
          fontFamily: "var(--font-ibm-plex-mono)",
          color: "var(--ink-soft)",
        }}
      >
        {label}
      </label>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="px-3 py-2 text-sm border rounded-lg outline-none transition-colors disabled:opacity-50"
        style={{
          borderColor: isOpen ? "var(--accent)" : "var(--line)",
          backgroundColor: disabled ? "#f8f6f4" : "var(--paper)",
          color: "var(--ink)",
        }}
      />

      {/* Dropdown */}
      {isOpen && dropdownItems.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg overflow-hidden z-10"
          style={{
            borderColor: "var(--line)",
            boxShadow: "var(--shadow-pop)",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          {dropdownItems.map((item, index) => {
            const isCreateNew = item.id === "__create__";
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  // Use onMouseDown instead of onClick so it fires before input blur
                  e.preventDefault();
                  selectOption(item.name);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className="w-full px-3 py-2 text-left text-sm transition-colors cursor-pointer"
                style={{
                  backgroundColor: isHighlighted
                    ? "var(--accent-soft)"
                    : "transparent",
                  color: "var(--ink)",
                  borderLeft: isHighlighted
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                }}
              >
                {isCreateNew ? (
                  <span>
                    <span
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono)",
                        color: "var(--accent)",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      Create new:{" "}
                    </span>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                  </span>
                ) : (
                  item.name
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
