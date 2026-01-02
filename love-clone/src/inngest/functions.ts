import { grok, createAgent, createTool, createNetwork, type Tool } from "@inngest/agent-kit";
import { Sandbox } from 'e2b'
import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "./prompt";
import { z }from "zod";
import { prisma } from "@/lib/db";

interface AgentState {
    summary: string;
    files: { [path: string]: string };
};

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {

    const sandboxId = await step.run("get-sandbox-id", async () => { 
        // Create sandbox with 10-minute initial timeout as a safety net
        // This gives enough time for agent execution (which can take 1-3 minutes)
        // The timeout will be reset to 5 minutes right before returning the URL
        const sandbox = await Sandbox.create('love-clone-test-4-dev', {
            timeoutMs: 10 * 60 * 1000, // 10 minutes initial (safety net for execution)
        });

        return sandbox.sandboxId;
    }) 
    const codeAgent = createAgent<AgentState>({
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
                    { step, network }: Tool.Options<AgentState>
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

    const network = createNetwork<AgentState>({
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

    const isError = 
        !result.state.data.summary ||
        Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
        // Reconnect to the sandbox to get the URL
        const sandbox = await getSandbox(sandboxId);
        
        // CRITICAL: Explicitly extend the timeout right before returning the URL
        // This ensures the sandbox stays alive for a full 5 minutes from NOW,
        // even after the Inngest function completes and the creating connection closes.
        // Without this, the sandbox might close prematurely when the function ends.
        await sandbox.setTimeout(5 * 60 * 1000); // Reset to 5 minutes from now
        
        const host = sandbox.getHost(3000);
        return `https://${host}`;
    });

    await step.run("save-result", async () => {
        if (isError) {
            return await prisma.message.create ({
                data: {
                    content: "Something went wrong, please try again.",
                    role: "ASSISTANT",
                    type: "ERROR",
                },
            });
        }
        return await prisma.message.create({
            data: {
                content: result.state.data.summary,
                role: "ASSISTANT",
                type: "RESULT",
                fragment: {
                    create: {
                        sandboxUrl: sandboxUrl,
                        title: "Fragment",
                        files: result.state.data.files,
                    },
                },
            },
        })
    })

    return {
        url: sandboxUrl,
        title: "Fragment",
        files: result.state.data.files,
        summary: result.state.data.summary,
    }
  })