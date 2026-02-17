export type RemainingTimeInfo = {
  shortLabel: string;
  longLabel: string;
  isClosed: boolean;
};

export function getRemainingTimeInfo(value?: Date | string | null): RemainingTimeInfo {
  if (!value) {
    return {
      shortLabel: "—",
      longLabel: "Nincs elérhető zárási idő",
      isClosed: false,
    };
  }

  const targetTime = new Date(value).getTime();
  const diffMs = targetTime - Date.now();

  if (diffMs <= 0) {
    return {
      shortLabel: "🔒",
      longLabel: "A fogadás lezárt",
      isClosed: true,
    };
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (totalHours < 1) {
    return {
      shortLabel: "<1ó",
      longLabel: "Kevesebb mint 1 óra van hátra",
      isClosed: false,
    };
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return {
      shortLabel: `${days}n ${hours}ó`,
      longLabel: `${days} nap ${hours} óra van hátra`,
      isClosed: false,
    };
  }

  return {
    shortLabel: `${hours}ó`,
    longLabel: `${hours} óra van hátra`,
    isClosed: false,
  };
}
