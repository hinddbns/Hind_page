import { Loader2 } from "lucide-react";
import { getT } from "@/i18n/server";

export default async function AppLoading() {
  const { t } = await getT();

  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
