import dictionary from "./dictionaries/ar";

export function useLocale() {
  return { t: dictionary, dir: "rtl" as const };
}
