export function toHun(position: string): string {
  if (position === "YES") {
    return "IGEN";
  } else if (position === "NO") {
    return "NEM";
  } else {
    return position;
  }
}
