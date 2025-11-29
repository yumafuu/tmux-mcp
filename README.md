# Tmux MCP Server

A Model Context Protocol (MCP) server for controlling tmux sessions, windows, and panes.

## Features

- List tmux sessions, windows, and panes
- Split panes horizontally or vertically
- Send commands to panes
- Kill and select panes
- Execute commands in newly created panes

## Prerequisites

- [Deno](https://deno.land/) runtime
- [tmux](https://github.com/tmux/tmux/wiki) installed and in PATH

## Installation

Clone this repository:

```bash
git clone <repository-url>
cd tmuxmcp
```

## Usage

### Running the server

```bash
deno task start
```

Or directly:

```bash
deno run --allow-all main.ts
```

### Available Tools

#### `list_sessions`
List all tmux sessions.

```json
{}
```

#### `list_windows`
List windows in a tmux session.

```json
{
  "session": "optional-session-name"
}
```

#### `list_panes`
List panes in a tmux window or session.

```json
{
  "target": "optional-session:window"
}
```

#### `split_pane`
Split a tmux pane horizontally or vertically.

```json
{
  "target": "optional-pane-id",
  "direction": "horizontal | vertical",
  "command": "optional-command-to-run"
}
```

Example:
```json
{
  "direction": "horizontal",
  "command": "htop"
}
```

#### `send_command`
Send a command to a tmux pane.

```json
{
  "target": "optional-pane-id",
  "command": "ls -la",
  "enter": true
}
```

#### `kill_pane`
Kill a tmux pane.

```json
{
  "target": "pane-id-or-index"
}
```

#### `select_pane`
Select a tmux pane.

```json
{
  "target": "pane-id-or-index"
}
```

## Example Workflow

1. List current sessions:
   ```json
   {"tool": "list_sessions"}
   ```

2. Split the current pane horizontally:
   ```json
   {
     "tool": "split_pane",
     "direction": "horizontal"
   }
   ```

3. Send a command to the new pane:
   ```json
   {
     "tool": "send_command",
     "command": "npm run dev"
   }
   ```

## Configuration for Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "tmux": {
      "command": "deno",
      "args": ["run", "--allow-all", "jsr:@yumafuu/tmux-mcp"]
    }
  }
}
```

## License

MIT
