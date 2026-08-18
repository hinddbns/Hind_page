import { Search } from "lucide-react";

export default function AdminSearchForm({
  placeholder,
  searchLabel,
  defaultValue,
  hiddenParams,
}: {
  placeholder: string;
  searchLabel: string;
  defaultValue?: string;
  hiddenParams?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="mt-4 max-w-sm">
      {Object.entries(hiddenParams ?? {}).map(
        ([key, value]) => value && <input key={key} type="hidden" name={key} value={value} />
      )}
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={searchLabel}
          className="w-full rounded-lg border border-primary-light bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-primary"
        />
      </div>
    </form>
  );
}
