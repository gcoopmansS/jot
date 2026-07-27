"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Custom autocomplete input that clearly shows:
 * - Existing options you can select
 * - "Create new: [name]" when typing something that doesn't exist
 *
 * Much clearer than native datalist which varies by browser/OS.
 *
 * Dropdown is rendered via portal at body level to avoid clipping issues,
 * and automatically flips upward when near the bottom of the viewport.
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
  const [openUpward, setOpenUpward] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Calculate dropdown position and direction when opening
  const updateDropdownPosition = () => {
    if (!inputRef.current) return;

    const inputRect = inputRef.current.getBoundingClientRect();
    const dropdownMaxHeight = 240; // matches maxHeight in styles
    const spacing = 4; // small gap between input and dropdown
    const viewportHeight = window.innerHeight;

    // Calculate space available below and above the input
    const spaceBelow = viewportHeight - inputRect.bottom - spacing;
    const spaceAbove = inputRect.top - spacing;

    // Decide whether to open upward or downward
    const shouldOpenUpward = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;
    setOpenUpward(shouldOpenUpward);

    // Calculate top position
    const top = shouldOpenUpward
      ? inputRect.top - spacing // Will use transform to position above
      : inputRect.bottom + spacing;

    setDropdownPosition({
      top,
      left: inputRect.left,
      width: inputRect.width,
    });
  };

  // Update position when opening or on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();

    const handleUpdate = () => {
      updateDropdownPosition();
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
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
    updateDropdownPosition();
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
    <>
      <div ref={wrapperRef} className="flex flex-col gap-1">
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
          className="px-3 py-2 text-sm border rounded-lg outline-none transition-colors disabled:opacity-50 placeholder:text-[var(--ink-soft)]"
          style={{
            borderColor: isOpen ? "var(--accent)" : "var(--line)",
            backgroundColor: disabled ? "var(--paper)" : "var(--paper)",
            color: "var(--ink)",
            fontFamily: "var(--font-ibm-plex-sans)",
          }}
        />
      </div>

      {/* Dropdown rendered via portal at body level to avoid clipping */}
      {isOpen &&
        dropdownItems.length > 0 &&
        !disabled &&
        dropdownPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed bg-white border rounded-lg overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              transform: openUpward ? "translateY(-100%)" : "none",
              borderColor: "var(--line)",
              boxShadow: "var(--shadow-pop)",
              maxHeight: "240px",
              overflowY: "auto",
              zIndex: 9999, // Ensure it's above everything, including the categorize bar
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
          </div>,
          document.body,
        )}
    </>
  );
}
