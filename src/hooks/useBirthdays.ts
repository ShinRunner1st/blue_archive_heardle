import React from "react";

import { birthdaysOn } from "../helpers/birthdays";
import { Student } from "../types/student";

/**
 * The students whose birthday it is, checked again whenever the tab comes
 * back, so one left open overnight moves on with the date.
 */
export function useBirthdays(): Student[] {
  const [today, setToday] = React.useState(() => birthdaysOn());

  React.useEffect(() => {
    const check = () =>
      setToday((previous) => {
        const next = birthdaysOn();
        const same =
          next.length === previous.length &&
          next.every((student, i) => student.id === previous[i].id);
        return same ? previous : next;
      });
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return today;
}
