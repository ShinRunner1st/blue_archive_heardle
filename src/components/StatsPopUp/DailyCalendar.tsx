import React from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

import {
  CalendarDay,
  calendarMonths,
  calendarWeeks,
  DayOutcome,
} from "../../helpers/dailyCalendar";
import { dayNumber } from "../../helpers/daily";

import * as Styled from "./index.styled";

/**
 * Where the greens change: up to `best` tries is the brightest, up to `good`
 * the next, and past it the last, up to `most` (or with no end).
 */
export interface CalendarBands {
  best: number;
  good: number;
  most?: number;
}

/** The OST's six tries. */
const TRY_BANDS: CalendarBands = { best: 2, good: 4, most: 6 };

interface Props {
  outcomes: Map<number, DayOutcome>;
  /** Today's puzzle number; passed in by tests. */
  today?: number;
  bands?: CalendarBands;
  /** What a try is called in the day's description: a try, or a guess. */
  unit?: [one: string, many: string];
}

const WEEKDAYS = [
  ["S", "Sunday"],
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
] as const;

type DayTone = Exclude<Styled.DayTone, "none">;

/** Fewer tries reads greener; a lost day is red. */
function toneFor(
  outcome: DayOutcome | undefined,
  isToday: boolean,
  bands: CalendarBands
): DayTone {
  if (!outcome) return isToday ? "open" : "missed";
  if (!outcome.won) return "lost";
  if (outcome.tries <= bands.best) return "best";
  if (outcome.tries <= bands.good) return "good";
  return "close";
}

function describe(
  outcome: DayOutcome | undefined,
  isToday: boolean,
  [one, many]: [string, string]
): string {
  if (!outcome) return isToday ? "not finished yet" : "not played";
  if (!outcome.won) return "lost";
  return `won in ${outcome.tries} ${outcome.tries === 1 ? one : many}`;
}

function legendFor(
  { best, good, most }: CalendarBands,
  [, many]: [string, string]
): Array<{ tone: DayTone; label: string }> {
  return [
    { tone: "best", label: `1-${best} ${many}` },
    { tone: "good", label: `${best + 1}-${good}` },
    { tone: "close", label: most ? `${good + 1}-${most}` : `${good + 1}+` },
    { tone: "lost", label: "Lost" },
    { tone: "missed", label: "Not played" },
  ];
}

function Day({
  cell,
  outcomes,
  monthName,
  bands,
  unit,
}: {
  cell: CalendarDay;
  outcomes: Map<number, DayOutcome>;
  monthName: string;
  bands: CalendarBands;
  unit: [string, string];
}) {
  if (cell.day === null) {
    return <Styled.Day $tone="none">{cell.date}</Styled.Day>;
  }

  const outcome = outcomes.get(cell.day);
  const label = `${cell.date} ${monthName}, puzzle #${cell.day}: ${describe(
    outcome,
    cell.isToday,
    unit
  )}`;

  return (
    <Styled.Day
      $tone={toneFor(outcome, cell.isToday, bands)}
      $today={cell.isToday}
      title={label}
    >
      <span aria-hidden="true">{cell.date}</span>
      <Styled.Hidden>{label}</Styled.Hidden>
    </Styled.Day>
  );
}

/**
 * Every daily puzzle on a calendar, coloured by how it went. It shows no song
 * names, so it can't spoil a puzzle someone else hasn't played yet.
 */
export function DailyCalendar({
  outcomes,
  today = dayNumber(),
  bands = TRY_BANDS,
  unit = ["try", "tries"],
}: Props) {
  const months = React.useMemo(() => calendarMonths(today), [today]);
  const [index, setIndex] = React.useState(months.length - 1);
  const shown = months[Math.min(index, months.length - 1)];

  const first = new Date(shown.year, shown.month, 1);
  const monthName = first.toLocaleDateString("en-GB", { month: "long" });
  const heading = first.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <Styled.Calendar>
      <Styled.CalendarHead>
        <Styled.MonthButton
          type="button"
          aria-label="Previous month"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
        >
          <IoChevronBack aria-hidden="true" />
        </Styled.MonthButton>
        <Styled.MonthName aria-live="polite">{heading}</Styled.MonthName>
        <Styled.MonthButton
          type="button"
          aria-label="Next month"
          disabled={index >= months.length - 1}
          onClick={() => setIndex((i) => Math.min(i + 1, months.length - 1))}
        >
          <IoChevronForward aria-hidden="true" />
        </Styled.MonthButton>
      </Styled.CalendarHead>

      <Styled.Grid aria-label={heading}>
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long]) => (
              <Styled.Weekday key={long} scope="col" abbr={long}>
                {short}
              </Styled.Weekday>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks(shown, today).map((week, w) => (
            <tr key={w}>
              {week.map((cell, d) => (
                <td key={d}>
                  {cell && (
                    <Day
                      cell={cell}
                      outcomes={outcomes}
                      monthName={monthName}
                      bands={bands}
                      unit={unit}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Styled.Grid>

      <Styled.Legend aria-hidden="true">
        {legendFor(bands, unit).map(({ tone, label }) => (
          <Styled.LegendItem key={tone}>
            <Styled.Swatch $tone={tone} />
            {label}
          </Styled.LegendItem>
        ))}
      </Styled.Legend>
    </Styled.Calendar>
  );
}
