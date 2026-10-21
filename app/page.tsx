import Link from "next/link";

import { Onboarding } from "@/components/onboarding";
import { getConnectionId } from "@/lib/session";

export default async function Home({ searchParams }: { searchParams: Promise<{ renovar?: string }> }) {
  const { renovar } = await searchParams;
  const connectionId = await getConnectionId();

  return (
    <>
      {connectionId && !renovar ? (
        <div className="mb-8 flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-sm">
          <span>
            Ya tienes una cuenta conectada <span className="font-mono text-xs text-muted">{connectionId}</span>
          </span>
          <Link href="/panel" className="font-medium underline underline-offset-4">
            Ir al panel
          </Link>
        </div>
      ) : null}
      <Onboarding renewing={Boolean(renovar)} />
    </>
  );
}
