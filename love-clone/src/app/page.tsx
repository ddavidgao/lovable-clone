import { getQueryClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { HydrationBoundary } from "@tanstack/react-query";
import { Client } from "./client";
const Page = async () => {

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.createAI.queryOptions({ text: "Antonio PREFETCH" }));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback = {<div>Loading...</div>}>
        <Client />
      </Suspense>
    </HydrationBoundary>
  );
}

export default Page;