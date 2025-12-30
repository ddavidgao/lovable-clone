import { grok, createAgent } from "@inngest/agent-kit";

import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
    const codeAgent = createAgent({
        name: "code-agent",
        system: "You are an expert next.js developer.  You write readable, maintainable, and efficient code. You write simple Next.js and React snippets.",
        model: grok({ model:"grok-4-1-fast-reasoning", apiKey: process.env.XAI_API_KEY}),
      });

      const { output } = await codeAgent.run(
        `Write the following snippet: ${event.data.value}`,
      );
      console.log(output);

    return { output };
  },
);