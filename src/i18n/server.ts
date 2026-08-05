import dictionary from "./dictionaries/ar";

export { interpolate } from "./config";

export async function getT() {
  return { t: dictionary, dir: "rtl" as const };
}
