import React from "react";

import { birthdaysWithin } from "../../helpers/birthdays";
import { Portrait, usePortraits } from "../Portrait";

import * as Styled from "./index.styled";

/** "Today", "Tomorrow", or "Fri 3 Oct", in the player's own language. */
function dayLabel(date: Date, today: Date): string {
  const days = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime()) /
      86_400_000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * The students with a birthday in the coming week, today's first, with
 * their portraits. Left out in a week with none.
 */
export function Birthdays() {
  const today = React.useMemo(() => new Date(), []);
  const soon = React.useMemo(() => birthdaysWithin(7, today), [today]);
  const portraits = usePortraits(soon.map(({ student }) => student.id));

  if (soon.length === 0) return null;

  return (
    <Styled.Panel aria-labelledby="hub-birthdays">
      <Styled.PanelHead>
        <Styled.PanelTitle id="hub-birthdays">
          Birthdays this week
        </Styled.PanelTitle>
      </Styled.PanelHead>
      <Styled.List>
        {soon.map(({ student, date }) => {
          const url = portraits.get(student.id);
          const label = dayLabel(date, today);
          return (
            <Styled.Birthday key={student.id}>
              {url ? <Portrait url={url} size={30} /> : <Styled.NoPortrait />}
              <Styled.BirthdayName>{student.name}</Styled.BirthdayName>
              <Styled.BirthdayDay $today={label === "Today"}>
                {label === "Today" ? "Today 🎂" : label}
              </Styled.BirthdayDay>
            </Styled.Birthday>
          );
        })}
      </Styled.List>
    </Styled.Panel>
  );
}
