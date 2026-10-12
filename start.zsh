#!/bin/zsh

# Keep these commands on one line: ~/.zshrc installs a preexec hook that writes
# terminal title escapes to stdout between script lines, corrupting MCP stdio.
source "$HOME/.zshrc" >/dev/null 2>&1; preexec_functions=(); precmd_functions=(); unfunction preexec precmd 2>/dev/null; exec node "${0:A:h}/server.mjs"
