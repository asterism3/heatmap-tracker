import { Box, Colors, Entry, TrackerData, TrackerSettings } from "src/types";

export function clamp(input: number, min: number, max: number): number {
  return input < min ? min : input > max ? max : input;
}

export function mapRange(
  current: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const mapped: number =
    ((current - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  return clamp(mapped, outMin, outMax);
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function getDayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getShiftedWeekdays(weekdays: string[], weekStartDay: number): string[] {
  if (weekStartDay < 0 || weekStartDay > 6) {
    throw new Error('weekStartDay must be between 0 and 6');
  }

  return weekdays.slice(weekStartDay).concat(weekdays.slice(0, weekStartDay));
}

export function getFirstDayOfYear(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}

export function getNumberOfEmptyDaysBeforeYearStarts(year: number, weekStartDay: number): number {
  if (isNaN(weekStartDay) || weekStartDay < 0 || weekStartDay > 6) {
    throw new Error('weekStartDay must be a number between 0 and 6');
  }

  if (isNaN(year)) {
    throw new Error('year must be a number');
  }

  const firstDayOfYear = getFirstDayOfYear(year);
  const firstWeekday = firstDayOfYear.getUTCDay();
  return (firstWeekday - weekStartDay + 7) % 7;
}

export function getLastDayOfYear(year: number): Date {
  return new Date(Date.UTC(year, 11, 31));
}

export function getEntriesForYear(entries: Entry[], year: number): Entry[] {
  return entries.filter((e) => {
    if (!isValidDate(e.date)) {
      return false;
    }

    return new Date(e.date).getFullYear() === year;
  });
}

export function getMinMaxIntensities(intensities: number[]): [number, number] {
  return [
    Math.min(...intensities),
    Math.max(...intensities),
  ];
}

export function getColors(trackerData: TrackerData, settingsColors: Colors): Colors {
  if (typeof trackerData.colors === 'string') {
    return settingsColors[trackerData.colors]
      ? { [trackerData.colors]: settingsColors[trackerData.colors] }
      : settingsColors;
  }

  return trackerData.colors ?? settingsColors;
}

export function getPrefilledBoxes(numberOfEmptyDaysBeforeYearBegins: number): Box[] {
  if (isNaN(numberOfEmptyDaysBeforeYearBegins)) {
    throw new Error('numberOfEmptyDaysBeforeYearBegins must be a number');
  }

  return Array(numberOfEmptyDaysBeforeYearBegins).fill({
    backgroundColor: "transparent",
  });
}

export function getEntriesIntensities(entries: Entry[]): number[] {
  return entries.filter((e) => e.intensity).map((e) => e.intensity as number);
}

export function fillEntriesWithIntensity(
  entries: Entry[],
  trackerData: TrackerData,
  colors: Colors,
  settings: TrackerSettings,
): Record<number, Entry> {
  const intensities = getEntriesIntensities(entries);

  // If we can't receive min/max intensities from entries,
  // try to use them from user's config or use them from default settings.
  const [minimumIntensity, maximumIntensity] = intensities.length
    ? getMinMaxIntensities(intensities)
    : [
      trackerData.intensityScaleStart ?? settings.intensityScaleStart,
      trackerData.intensityScaleEnd ?? settings.intensityScaleEnd,
    ];

  // If user defined intensityScaleStart explicitly use them,
  // otherwise minimum and maximum from entries will be used.
  const intensityScaleStart =
    trackerData.intensityScaleStart ?? minimumIntensity;
  const intensityScaleEnd = trackerData.intensityScaleEnd ?? maximumIntensity;

  const entriesByDay: Record<number, Entry> = {};

  entries.forEach((e) => {
    const newEntry = {
      intensity: trackerData.defaultEntryIntensity,
      ...e,
    };

    const colorIntensities =
      typeof colors === "string"
        ? settings.colors[colors]
        : colors[e.color] ?? colors[Object.keys(colors)[0]];

    const numberOfColorIntensities = Object.keys(colorIntensities).length;

    if (
      minimumIntensity === maximumIntensity &&
      intensityScaleStart === intensityScaleEnd
    ) {
      newEntry.intensity = numberOfColorIntensities;
    } else {
      newEntry.intensity = Math.round(
        mapRange(
          newEntry.intensity,
          intensityScaleStart,
          intensityScaleEnd,
          1,
          numberOfColorIntensities
        )
      );
    }

    const day = getDayOfYear(new Date(e.date));

    entriesByDay[day] = newEntry;
  });

  return entriesByDay;
}

export function getBoxes(
  currentYear: number,
  entriesWithIntensity: Record<number, Entry>,
  colors: Colors,
  separateMonths: boolean,
  trackerData: TrackerData,
  settings: TrackerSettings
): Box[] {
  const numberOfEmptyDaysBeforeYearStarts =
    getNumberOfEmptyDaysBeforeYearStarts(currentYear, settings.weekStartDay);

  const boxes = getPrefilledBoxes(numberOfEmptyDaysBeforeYearStarts);

  const lastDayOfYear = getLastDayOfYear(currentYear);
  const numberOfDaysInYear = getDayOfYear(lastDayOfYear);
  const todaysDayNumberLocal = getDayOfYear(new Date());

  for (let day = 1; day <= numberOfDaysInYear; day++) {
    const box: Box = {};

    const currentDate = new Date(currentYear, 0, day);

    // We don't need to add padding before January.
    if (separateMonths && day > 31) {
      const dayInMonth = Number(
        currentDate.toLocaleString("en-us", { day: "numeric" })
      );
      if (dayInMonth === 1) {
        for (let i = 0; i < 7; i++) {
          const emptyBox = {
            isSpaceBetweenBox: true,
          };
          boxes.push(emptyBox);
        }
      }
    }

    const month = currentDate.toLocaleString("en-US", { month: "short" });
    box.name = `month-${month.toLowerCase()}`;

    if (day === todaysDayNumberLocal) {
      box.isToday = true;
      box.showBorder = trackerData.showCurrentDayBorder;
    }

    if (entriesWithIntensity[day]) {
      box.hasData = true;
      const entry = entriesWithIntensity[day];

      box.date = entry.date;

      if (entry.content) {
        box.content = entry.content;
      }

      const currentDayColors = entry.color
        ? colors[entry.color]
        : colors[Object.keys(colors)[0]];

      box.backgroundColor = currentDayColors[(entry.intensity as number) - 1];
    } else {
      box.hasData = false;
    }

    boxes.push(box);
  }

  return boxes;
}