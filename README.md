# Actual Budget CLI MCP

Local stdio MCP server for the installed `@actual-app/cli` command. It starts a
zsh process, sources `~/.zshrc`, and launches `server.mjs`. Connection settings
come from the existing `ACTUAL_*` environment variables or the CLI's config.
No credentials are stored in this directory.

The server exposes `actual_operations`, `actual_read`, and `actual_write`.
`actual_operations` lists every supported operation and its parameter names.
Amounts passed to write operations are integer cents, as required by the CLI.
The server invokes `actual` directly without a shell and returns JSON output.
It does not accept credential or server URL overrides through MCP tools.

Run the local protocol tests with:

```sh
node server.test.mjs
```

The portable `plugin.json` and `mcp.json` are included for local plugin hosts.

CLI reference: https://actualbudget.org/docs/api/cli/
