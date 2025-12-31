import { grok, createAgent } from "@inngest/agent-kit";
import { Sandbox } from 'e2b'
import { inngest } from "./client";
import { getSandbox } from "./utils";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandbox-id", async () => { 
        const sandbox = await Sandbox.create('love-clone-test-4-dev');
        return sandbox.sandboxId;
    }) 
    const codeAgent = createAgent({
        name: "code-agent",
        system: "You are an expert next.js developer.  You write readable, maintainable, and efficient code. You write simple Next.js and React snippets.",
        model: grok({ model:"grok-4-1-fast-reasoning", apiKey: process.env.XAI_API_KEY}),
    });

    const { output } = await codeAgent.run(
        `Write the following snippet: ${event.data.value}`,
    );
    console.log(output);


    const sandboxUrl = await step.run("get-sandbox-url", async () => {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        return `https://${host}`;
    })
    return { output, sandboxUrl };
  })