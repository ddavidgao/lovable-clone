import { grok, createAgent, createTool, createNetwork } from "@inngest/agent-kit";
import { Sandbox } from 'e2b'
import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "./prompt";
import { z }from "zod";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandbox-id", async () => { 
        const sandbox = await Sandbox.create('love-clone-test-4-dev', {
            timeoutMs: 60 * 60 * 1000, // 1 hour (max is 24 hours)
        });
        return sandbox.sandboxId;
    }) 
    const codeAgent = createAgent({
        name: "code-agent",
        description: "An expert coding agent",
        system: PROMPT,
        model: grok({ 
            model:"grok-4-1-fast-reasoning", apiKey: process.env.XAI_API_KEY,
            defaultParameters: {
                temperature: 0.1,
            }
        }),
        tools: [
            createTool({
                name: "terminal",
                description: "Use the terminal to run commands.",
                parameters: z.object({
                    command: z.string(),
                }),
                handler: async ({ command }, { step }) => {
                    return await step?.run("terminal", async () => {
                        const buffers = { stdout: "", stderr: ""};

                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const result = await sandbox.commands.run(command, {
                                onStdout: (data: string) => {
                                    buffers.stdout += data;
                                },
                                onStderr: (data: string) => {
                                    buffers.stderr += data;
                                }
                            });
                            return result.stdout;
                        } catch (e) {
                            console.error(
                                `Command failed: ${e} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`,
                            );
                            return `Command failed: ${e} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
                        }
                    })
                }
            }),
            createTool({
                name: "create-or-update-files",
                description: "Create or update files in the sandbox.",
                parameters: z.object({
                    files: z.array(
                        z.object({
                            path: z.string(),
                            content: z.string(),
                        }),   
                    ),
                }),
                handler: async (
                    { files },
                    { step, network }
                ) => {
                    const newFiles = await step?.run("create-or-update-files", async () => {
                        try {
                            const updateFiles = network.state.data.files || {};
                            const sandbox = await getSandbox(sandboxId);
                            for (const file of files) {
                                await sandbox.files.write(file.path, file.content);
                                updateFiles[file.path] = file.content;
                            }
                            return updateFiles;
                        } catch (e) {
                            return "Error: " + e;
                        }
                    });

                    if (typeof newFiles === "object") {
                        network.state.data.files = newFiles;
                    }
                }
            }),
            createTool({
                name: "read-files",
                description: "Read files from the sandbox.",
                parameters: z.object({
                    files: z.array(z.string()),
                }),
                handler: async ({ files }, { step }) => {
                    return await step?.run("read-files", async () => {
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const contents = [];
                            for (const file of files) {
                                const content = await sandbox.files.read(file);
                                contents.push({ path: file, content});
                            }
                            return JSON.stringify(contents);
                        } catch (e) {
                            return "Error: " + e;
                        }
                    });
                },
            })
        ],
        lifecycle: {
            onResponse: async ({ result, network}) => {
                const lastAssistantMessageText =
                    lastAssistantTextMessageContent(result);
                if (lastAssistantMessageText && network) {
                    if (lastAssistantMessageText.includes("<task_summary>")) {
                        network.state.data.summary = lastAssistantMessageText;
                    }
                }
                return result;
            }
        }
    });

    const network = createNetwork({
        name: "coding-agent-network",
        agents: [codeAgent],
        maxIter: 15,
        router: async ({ network }) => {
            const summary = network.state.data.summary;
            if (summary) {
                return;
            }
            return codeAgent;
        }
    })

    const result = await network.run(event.data.value);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        return `https://${host}`;
    })
    return {
        url: sandboxUrl,
        title: "Fragment",
        files: result.state.data.files,
        summary: result.state.data.summary,
    }
  })