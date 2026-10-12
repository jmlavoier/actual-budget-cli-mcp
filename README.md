# Actual Budget CLI MCP

Local stdio MCP server for the installed `@actual-app/cli` command. The MCP
configuration runs `server.mjs` directly with Node. Connection settings come
from inherited `ACTUAL_*` environment variables or the CLI's config. You can
use a local, gitignored `.envrc` to set those variables with direnv.

## Connect to Actual

Install [direnv](https://direnv.net/docs/installation.html). For interactive zsh
shells, add `eval "$(direnv hook zsh)"` to `~/.zshrc` and restart the shell; see
the [direnv shell setup guide](https://direnv.net/docs/hook.html) for other shells.

From this directory, copy the template and fill in its first three exports:

```sh
cp .envrc-example .envrc
chmod 600 .envrc
# Edit .envrc with your Actual connection details, then run:
direnv allow
```

Quote values in `.envrc` if they contain spaces or shell special characters.

| Variable | Where to find it |
| --- | --- |
| `ACTUAL_SERVER_URL` | The address you use to open your running Actual sync server in a browser, for example `https://actual.example.com` or `http://localhost:5006`. Use the server's base URL. |
| `ACTUAL_SYNC_ID` | Open the budget in Actual, then go to **Settings → Show advanced settings → Sync ID**. Copy that budget's Sync ID. |
| `ACTUAL_PASSWORD` | The password you use to log in to that Actual server. This is the server password, not the budget's encryption password. |

These three values are enough for a first connection. Leave the optional exports
commented out unless you need them. If your budget uses end-to-end encryption,
also set `ACTUAL_ENCRYPTION_PASSWORD` to its separate encryption password.
You may use `ACTUAL_SESSION_TOKEN` instead of `ACTUAL_PASSWORD` if you have a
session token.

Run `direnv allow` again after changing `.envrc`. The file is ignored by Git
but contains a plaintext password, so keep it private. The MCP host must
inherit these variables, for example by starting it from a direnv-enabled
shell. `mcp.json` runs Node directly and does not load `.envrc` itself.

To check the connection from this directory, run `actual budgets months` in a
direnv-enabled shell. You can also run
`direnv exec . actual budgets months` directly.

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

References: [Actual CLI](https://actualbudget.org/docs/api/cli/),
[Actual API setup](https://actualbudget.org/docs/api/).
