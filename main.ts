import { createToolsServer } from "jsr:@mizchi/mcp-helper@^0.0.4";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.5.0/server/stdio.js";
import { z } from "npm:zod@3.24.2";
import $ from "jsr:@david/dax@^0.42.0";
import type { Server } from "npm:@modelcontextprotocol/sdk@1.5.0/server/index.js";

const tools = [
  {
    name: "list_sessions",
    description: "List all tmux sessions",
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  {
    name: "list_windows",
    description: "List windows in a tmux session",
    inputSchema: z.object({
      session: z.string().optional().describe("Session name (default: current session)"),
    }),
    outputSchema: z.string(),
  },
  {
    name: "list_panes",
    description: "List panes in a tmux window or session",
    inputSchema: z.object({
      target: z.string().optional().describe("Target session:window (default: current)"),
    }),
    outputSchema: z.string(),
  },
  {
    name: "split_pane",
    description: "Split a tmux pane horizontally or vertically",
    inputSchema: z.object({
      target: z.string().optional().describe("Target pane (default: current pane)"),
      direction: z.enum(["horizontal", "vertical"]).describe("Split direction (horizontal: left/right, vertical: top/bottom)"),
      command: z.string().optional().describe("Command to run in the new pane"),
    }),
    outputSchema: z.string(),
  },
  {
    name: "send_command",
    description: "Send a command to a tmux pane",
    inputSchema: z.object({
      target: z.string().optional().describe("Target pane (default: current pane)"),
      command: z.string().describe("Command to execute"),
      enter: z.boolean().optional().default(true).describe("Press Enter after command (default: true)"),
    }),
    outputSchema: z.string(),
  },
  {
    name: "kill_pane",
    description: "Kill a tmux pane",
    inputSchema: z.object({
      target: z.string().describe("Target pane ID or index"),
    }),
    outputSchema: z.string(),
  },
  {
    name: "select_pane",
    description: "Select a tmux pane",
    inputSchema: z.object({
      target: z.string().describe("Target pane ID or index"),
    }),
    outputSchema: z.string(),
  },
] as const;

async function checkTmux(): Promise<void> {
  if (!await $.commandExists("tmux")) {
    throw new Error("tmux is not installed or not in PATH");
  }
}

async function listSessions(): Promise<string> {
  await checkTmux();
  try {
    const result = await $`tmux list-sessions -F "#{session_name}: #{session_windows} windows (created #{session_created_string})"`.text();
    return result || "No tmux sessions found";
  } catch (error) {
    if ((error as Error).message.includes("no server running")) {
      return "No tmux server running";
    }
    throw new Error(`Failed to list sessions: ${(error as Error).message}`);
  }
}

async function listWindows(session?: string): Promise<string> {
  await checkTmux();
  try {
    const target = session ? `-t ${session}` : "";
    const result = await $`tmux list-windows ${target} -F "#{window_index}: #{window_name} (#{window_panes} panes)"`.text();
    return result || "No windows found";
  } catch (error) {
    throw new Error(`Failed to list windows: ${(error as Error).message}`);
  }
}

async function listPanes(target?: string): Promise<string> {
  await checkTmux();
  try {
    const targetArg = target ? `-t ${target}` : "";
    const result = await $`tmux list-panes ${targetArg} -F "#{pane_id} (#{pane_index}): #{pane_current_command} [#{pane_width}x#{pane_height}]${target ? '' : ' in #{session_name}:#{window_index}'}"`.text();
    return result || "No panes found";
  } catch (error) {
    throw new Error(`Failed to list panes: ${(error as Error).message}`);
  }
}

async function splitPane(
  target: string | undefined,
  direction: "horizontal" | "vertical",
  command?: string
): Promise<string> {
  await checkTmux();
  try {
    const dirFlag = direction === "horizontal" ? "-h" : "-v";
    const targetArg = target ? `-t ${target}` : "";
    const cmdArg = command ? command : "";

    if (cmdArg) {
      await $`tmux split-window ${dirFlag} ${targetArg} ${cmdArg}`.text();
    } else {
      await $`tmux split-window ${dirFlag} ${targetArg}`.text();
    }

    return `Pane split ${direction}ly${command ? ` with command: ${command}` : ""}`;
  } catch (error) {
    throw new Error(`Failed to split pane: ${(error as Error).message}`);
  }
}

async function sendCommand(
  target: string | undefined,
  command: string,
  enter: boolean
): Promise<string> {
  await checkTmux();
  try {
    const targetArg = target ? `-t ${target}` : "";

    if (enter) {
      await $`tmux send-keys ${targetArg} ${command} Enter`.text();
    } else {
      await $`tmux send-keys ${targetArg} ${command}`.text();
    }

    return `Command sent to pane${target ? ` ${target}` : ""}: ${command}`;
  } catch (error) {
    throw new Error(`Failed to send command: ${(error as Error).message}`);
  }
}

async function killPane(target: string): Promise<string> {
  await checkTmux();
  try {
    await $`tmux kill-pane -t ${target}`.text();
    return `Pane ${target} killed`;
  } catch (error) {
    throw new Error(`Failed to kill pane: ${(error as Error).message}`);
  }
}

async function selectPane(target: string): Promise<string> {
  await checkTmux();
  try {
    await $`tmux select-pane -t ${target}`.text();
    return `Pane ${target} selected`;
  } catch (error) {
    throw new Error(`Failed to select pane: ${(error as Error).message}`);
  }
}

const server: Server = createToolsServer(
  {
    name: "tmux-mcp",
    version: "1.0.0",
  },
  tools,
  {
    async list_sessions() {
      return await listSessions();
    },
    async list_windows(params: { session?: string }) {
      return await listWindows(params.session);
    },
    async list_panes(params: { target?: string }) {
      return await listPanes(params.target);
    },
    async split_pane(params: { target?: string; direction: "horizontal" | "vertical"; command?: string }) {
      return await splitPane(params.target, params.direction, params.command);
    },
    async send_command(params: { target?: string; command: string; enter?: boolean }) {
      return await sendCommand(params.target, params.command, params.enter ?? true);
    },
    async kill_pane(params: { target: string }) {
      return await killPane(params.target);
    },
    async select_pane(params: { target: string }) {
      return await selectPane(params.target);
    },
  }
);

if (import.meta.main) {
  await server.connect(new StdioServerTransport());
}

export default server;
export { listSessions, listWindows, listPanes, splitPane, sendCommand, killPane, selectPane };
