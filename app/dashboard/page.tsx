import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import { Suspense } from "react";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

export default function ProtectedPage() {
  return (
    // <div className="flex-1 w-full flex flex-col gap-12">
    <div className="main-container">
      {/* <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your user details</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          <Suspense>
            <UserDetails />
          </Suspense>
        </pre>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Next steps</h2>
        <FetchDataSteps />
      </div> */}
      {/* <div className="max-w-4xl w-full"> */}
        {/* <h1>Sales Dashboard</h1>
        <p className="subtitle">
          This page is under construction. Sales dashboard functionality will be available here.
        </p> */}
        {/* <div className="bg-card border border-border rounded-lg p-8 text-center"> */}
        <div className="w-full">
          {/* <p className="text-muted-foreground">
            Sales dashboard features coming soon...
          </p> */}
          {/* <iframe
            src="https://agile-bass.metabaseapp.com/public/dashboard/51b6289f-4cde-4f7d-96e1-0fe8a04643f0"
            frameBorder="0"
            width="800"
            height="600"
            allowTransparency
          ></iframe> */}
        </div>
      {/* </div> */}
    </div>
  );
}
