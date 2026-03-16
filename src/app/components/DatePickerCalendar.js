"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import "./DatePickerCalendar.css";

/** Build calendar grid for a month (weeks of 7 days, Sun–Sat). Each cell: { date, currentMonth, year, month }. */
export function getCalendarGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const grid = [];
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate();
  let day = 1;
  let nextMonthDay = 1;
  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      const i = row * 7 + col;
      if (i < startDay) {
        const d = prevLast - startDay + i + 1;
        week.push({ date: d, currentMonth: false, year: prevYear, month: prevMonth });
      } else if (day <= daysInMonth) {
        week.push({ date: day, currentMonth: true, year, month });
        day++;
      } else {
        week.push({ date: nextMonthDay, currentMonth: false, year: month === 11 ? year + 1 : year, month: month === 11 ? 0 : month + 1 });
        nextMonthDay++;
      }
    }
    grid.push(week);
  }
  return grid;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format YYYY-MM-DD from Date */
export function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const YEAR_RANGE_SIZE = 12;
function getYearRange(centerYear) {
  const start = Math.floor(centerYear / YEAR_RANGE_SIZE) * YEAR_RANGE_SIZE;
  return Array.from({ length: YEAR_RANGE_SIZE }, (_, i) => start + i);
}

/** Single calendar: day view, month picker, year picker. Optional range for highlighting.
 *  isStartCalendar: when true, clicking a month sets date to first day; when false, to last day. */
export function MiniCalendar({
  label,
  selectedDate,
  onSelect,
  monthState,
  onMonthChange,
  rangeStartDate,
  rangeEndDate,
  onDoubleClickSelect,
  isStartCalendar = true,
}) {
  const [view, setView] = useState("days");

  const grid = getCalendarGrid(monthState.year, monthState.month);
  const yearRange = useMemo(() => getYearRange(monthState.year), [monthState.year]);

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (!rangeStartDate || !rangeEndDate) return [null, null];
    const a = rangeStartDate;
    const b = rangeEndDate;
    return a <= b ? [a, b] : [b, a];
  }, [rangeStartDate, rangeEndDate]);

  const handleSelectMonth = (monthIndex) => {
    const year = monthState.year;
    const monthStr = String(monthIndex + 1).padStart(2, "0");
    const dateStr = isStartCalendar
      ? `${year}-${monthStr}-01`
      : `${year}-${monthStr}-${String(new Date(year, monthIndex + 1, 0).getDate()).padStart(2, "0")}`;
    onSelect(dateStr);
    onMonthChange({ year, month: monthIndex });
    setView("days");
  };

  const handleSelectYear = (year) => {
    onMonthChange({ year, month: monthState.month });
    setView("months");
  };

  return (
    <div className="docDateSingleCalendar">
      <div className="docDateCalendarHeader">
        {view === "days" && (
          <>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => (prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }))}
              aria-label={`Previous month (${label})`}
            >
              ‹
            </button>
            <span className="docDateCalendarMonthLabel docDateCalendarClickable">
              <button type="button" className="docDateCalendarHeaderMonth" onClick={() => setView("months")}>
                {MONTHS[monthState.month]}
              </button>
              {" "}
              <button type="button" className="docDateCalendarHeaderYear" onClick={() => setView("years")}>
                {monthState.year}
              </button>
            </span>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => (prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }))}
              aria-label={`Next month (${label})`}
            >
              ›
            </button>
          </>
        )}
        {view === "months" && (
          <>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year - 1 }))}
              aria-label={`Previous year (${label})`}
            >
              ‹
            </button>
            <button type="button" className="docDateCalendarMonthLabel docDateCalendarHeaderYearOnly" onClick={() => setView("years")}>
              {monthState.year}
            </button>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year + 1 }))}
              aria-label={`Next year (${label})`}
            >
              ›
            </button>
          </>
        )}
        {view === "years" && (
          <>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year - YEAR_RANGE_SIZE }))}
              aria-label={`Previous years (${label})`}
            >
              ‹
            </button>
            <span className="docDateCalendarMonthLabel">
              {yearRange[0]} – {yearRange[yearRange.length - 1]}
            </span>
            <button
              type="button"
              className="docDateCalendarNav"
              onClick={() => onMonthChange((prev) => ({ ...prev, year: prev.year + YEAR_RANGE_SIZE }))}
              aria-label={`Next years (${label})`}
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="docDateCalendarSubLabel">{label}</div>

      {view === "days" && (
        <table className="docDateCalendarTable" role="grid" aria-label={`${label} calendar`}>
          <thead>
            <tr>
              {WEEKDAYS.map((wd) => (
                <th key={wd} className="docDateCalendarWeekday" scope="col">{wd}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, ci) => {
                  const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.date).padStart(2, "0")}`;
                  const isSelected = selectedDate === dateStr;
                  const isRangeStart = rangeStart && rangeEnd && dateStr === rangeStart;
                  const isRangeEnd = rangeStart && rangeEnd && dateStr === rangeEnd;
                  const isInRange = rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd;
                  const rangeClass = isRangeStart && isRangeEnd
                    ? "docDateCalendarDayRangeStart docDateCalendarDayRangeEnd"
                    : isRangeStart
                      ? "docDateCalendarDayRangeStart"
                      : isRangeEnd
                        ? "docDateCalendarDayRangeEnd"
                        : isInRange
                          ? "docDateCalendarDayInRange"
                          : "";
                  const selectedClass = (rangeStart && rangeEnd) ? "" : (!rangeClass && isSelected ? "docDateCalendarDaySelected" : "");
                  return (
                    <td key={ci} className="docDateCalendarCell">
                      <button
                        type="button"
                        className={`docDateCalendarDay ${!cell.currentMonth ? "docDateCalendarDayOther" : ""} ${rangeClass} ${selectedClass}`}
                        onClick={() => onSelect(dateStr)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          if (onDoubleClickSelect) onDoubleClickSelect(dateStr);
                          else onSelect(dateStr);
                        }}
                        aria-pressed={isSelected || isInRange}
                        aria-label={`${cell.date} ${MONTHS[cell.month]} ${cell.year}`}
                      >
                        {cell.date}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "months" && (
        <div className="docDateMonthGrid" role="grid" aria-label={`Select month (${label})`}>
          {MONTHS_SHORT.map((name, index) => {
            const isSelected = monthState.month === index;
            return (
              <button
                key={name}
                type="button"
                className={`docDateMonthGridItem ${isSelected ? "docDateCalendarDaySelected" : ""}`}
                onClick={() => handleSelectMonth(index)}
                aria-pressed={isSelected}
                aria-label={`${MONTHS[index]} ${monthState.year}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {view === "years" && (
        <div className="docDateYearGrid" role="grid" aria-label={`Select year (${label})`}>
          {yearRange.map((y) => {
            const isSelected = monthState.year === y;
            return (
              <button
                key={y}
                type="button"
                className={`docDateYearGridItem ${isSelected ? "docDateCalendarDaySelected" : ""}`}
                onClick={() => handleSelectYear(y)}
                aria-pressed={isSelected}
                aria-label={`Year ${y}`}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Reusable date range filter dropdown: trigger + panel with quick options (All dates, Today, Last 7/30 days) and two calendars (start/end).
 *  Use the same component and CSS on Upload RFP, Conversation Log, or any page that needs a date range filter.
 *  Props: dateRangeFilter, onDateRangeFilterChange, customDateStart, customDateEnd, onCustomRangeChange, open, onOpenChange.
 *  Optional: triggerLabel (default "Date"), applyLabel (default "Apply range"). */
export function DateRangeFilterDropdown({
  dateRangeFilter,
  onDateRangeFilterChange,
  customDateStart,
  customDateEnd,
  onCustomRangeChange,
  open,
  onOpenChange,
  triggerLabel = "Date",
  applyLabel = "Apply range",
  wrapClassName,
}) {
  const ref = useRef(null);
  const todayStr = useMemo(() => toDateString(new Date()), []);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [monthEnd, setMonthEnd] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onOpenChange(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      if (dateRangeFilter === "custom" && customDateStart && customDateEnd) {
        setStartDate(customDateStart);
        setEndDate(customDateEnd);
        const [ys, ms] = customDateStart.split("-").map(Number);
        setMonthStart({ year: ys, month: (ms || 1) - 1 });
        const [ye, me] = customDateEnd.split("-").map(Number);
        setMonthEnd({ year: ye, month: (me || 1) - 1 });
      } else {
        const d = new Date();
        setStartDate(todayStr);
        setEndDate(todayStr);
        setMonthStart({ year: d.getFullYear(), month: d.getMonth() });
        const nextMonth = d.getMonth() === 11 ? new Date(d.getFullYear() + 1, 0, 1) : new Date(d.getFullYear(), d.getMonth() + 1, 1);
        setMonthEnd({ year: nextMonth.getFullYear(), month: nextMonth.getMonth() });
      }
    }
  }, [open, dateRangeFilter, customDateStart, customDateEnd, todayStr]);

  const options = [
    { id: "today", label: "Today" },
    { id: "last7", label: "Last 7 days" },
    { id: "last30", label: "Last 30 days" },
  ];

  const handleApplyRange = () => {
    const start = startDate || todayStr;
    const end = endDate || start;
    const [s, e] = [start, end].sort();
    onCustomRangeChange(s, e);
    onDateRangeFilterChange("custom");
    onOpenChange(false);
  };

  return (
    <div className={wrapClassName ? `docFilterDropdownWrap ${wrapClassName}` : "docFilterDropdownWrap"} ref={ref}>
      <button
        type="button"
        className="docSelect docFilterDropdownTrigger"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Filter by ${triggerLabel.toLowerCase()}`}
      >
        {triggerLabel} <span className="docFilterDropdownCaret">▼</span>
      </button>
      {open && (
        <div className="docFilterDropdownPanel docDateFilterPanel docDateFilterPanelWithCalendar" role="dialog" aria-label="Date range filter">
          <div className="docDateFilterLayout">
            <div className="docDateFilterButtons">
              <button
                type="button"
                className={`docDateFilterBtn ${dateRangeFilter == null ? "docDateFilterBtnActive" : ""}`}
                onClick={() => { onDateRangeFilterChange(null); onCustomRangeChange(null, null); onOpenChange(false); }}
                role="option"
                aria-selected={dateRangeFilter == null}
              >
                All dates
              </button>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`docDateFilterBtn ${dateRangeFilter === opt.id ? "docDateFilterBtnActive" : ""}`}
                  onClick={() => { onDateRangeFilterChange(opt.id); onCustomRangeChange(null, null); onOpenChange(false); }}
                  role="option"
                  aria-selected={dateRangeFilter === opt.id}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="docDateCalendarsRow">
              <MiniCalendar
                label="Start date"
                selectedDate={startDate}
                onSelect={setStartDate}
                monthState={monthStart}
                onMonthChange={setMonthStart}
                rangeStartDate={startDate && endDate ? startDate : null}
                rangeEndDate={startDate && endDate ? endDate : null}
                onDoubleClickSelect={(dateStr) => { setStartDate(dateStr); setEndDate(dateStr); }}
                isStartCalendar={true}
              />
              <MiniCalendar
                label="End date"
                selectedDate={endDate}
                onSelect={setEndDate}
                monthState={monthEnd}
                onMonthChange={setMonthEnd}
                rangeStartDate={startDate && endDate ? startDate : null}
                rangeEndDate={startDate && endDate ? endDate : null}
                onDoubleClickSelect={(dateStr) => { setStartDate(dateStr); setEndDate(dateStr); }}
                isStartCalendar={false}
              />
            </div>
          </div>
          <div className="docDateFilterApplyWrap">
            <button type="button" className="docDateFilterApplyBtn" onClick={handleApplyRange}>
              {applyLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable single-date filter dropdown: trigger + panel with "Today" and one calendar. Use on Conversation Log or any page that filters by a single date.
 *  Props: selectedDate, onSelectedDateChange, open, onOpenChange.
 *  Optional: triggerLabel (default "Date range"), applyLabel (default "Apply"), wrapClassName (e.g. "conversationLogDateDropdownWrap" for panel alignment). */
export function SingleDateFilterDropdown({
  selectedDate,
  onSelectedDateChange,
  open,
  onOpenChange,
  triggerLabel = "Date range",
  applyLabel = "Apply",
  wrapClassName,
}) {
  const ref = useRef(null);
  const todayStr = useMemo(() => toDateString(new Date()), []);

  const [tempDate, setTempDate] = useState(todayStr);
  const [monthState, setMonthState] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onOpenChange(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      const dateToShow = selectedDate || todayStr;
      setTempDate(dateToShow);
      if (dateToShow) {
        const [y, m] = dateToShow.split("-").map(Number);
        setMonthState({ year: y, month: (m || 1) - 1 });
      } else {
        const d = new Date();
        setMonthState({ year: d.getFullYear(), month: d.getMonth() });
      }
    }
  }, [open, selectedDate, todayStr]);

  const handleApply = () => {
    if (tempDate) onSelectedDateChange(tempDate);
    onOpenChange(false);
  };

  const handleTodayClick = () => {
    onSelectedDateChange(todayStr);
    onOpenChange(false);
  };

  return (
    <div className={wrapClassName ? `docFilterDropdownWrap ${wrapClassName}` : "docFilterDropdownWrap"} ref={ref}>
      <button
        type="button"
        className="docSelect docFilterDropdownTrigger"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Filter by ${triggerLabel.toLowerCase()}`}
      >
        {triggerLabel} <span className="docFilterDropdownCaret">▼</span>
      </button>
      {open && (
        <div className="docFilterDropdownPanel docDateFilterPanel docDateFilterPanelWithCalendar" role="dialog" aria-label="Date filter">
          <div className="docDateFilterLayout">
            <div className="docDateFilterButtons">
              <button
                type="button"
                className={`docDateFilterBtn ${!selectedDate ? "docDateFilterBtnActive" : ""}`}
                onClick={handleTodayClick}
                role="option"
                aria-selected={!selectedDate}
              >
                Today
              </button>
            </div>
            <div className="docDateCalendarsRow">
              <MiniCalendar
                label="Select date"
                selectedDate={tempDate}
                onSelect={setTempDate}
                monthState={monthState}
                onMonthChange={setMonthState}
              />
            </div>
          </div>
          <div className="docDateFilterApplyWrap">
            <button type="button" className="docDateFilterApplyBtn" onClick={handleApply}>
              {applyLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
