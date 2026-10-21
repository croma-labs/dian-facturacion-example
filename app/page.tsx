import { InspectorProvider } from "@/components/inspector";
import { Landing } from "@/components/landing";
import { SiteHeader } from "@/components/site-header";
import { Workspace } from "@/components/workspace";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

export default async function Home() {
  const session = await getSession();
  return (
    <InspectorProvider>
      <SiteHeader />
      {session ? <Workspace session={session} /> : <Landing />}
    </InspectorProvider>
  );
}
