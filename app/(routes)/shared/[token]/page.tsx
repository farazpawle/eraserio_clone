import { createAdminClient } from "@/lib/supabase/admin";
import { resolveShareToken } from "@/lib/data/shares";
import SharedFileView from "./SharedFileView";

export const dynamic = "force-dynamic";

// The link holder is not a team member, so RLS would hide the file: resolve the
// token on the server with the service role and send only this one file down.
const SharedFilePage = async ({ params }: { params: { token: string } }) => {
  const share = await resolveShareToken(createAdminClient(), params.token);
  return <SharedFileView token={params.token} share={share} />;
};

export default SharedFilePage;
