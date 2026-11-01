# CLI text AI providers

In **Settings → AI providers**, choose Codex, Claude Code, OpenCode, Pi or OMP from **Text AI provider**. The same selection powers brand interpretation, assistant replies, copy, weekly planning, composition design and creative revisions. Image generation independently supports [Cloudflare, custom local servers and Unsloth Studio](image-providers.md).

Install and sign in to the chosen CLI in your terminal first. Motif does not install agents, start model servers, copy credentials into its database or initiate login. Leave the executable path blank for PATH detection; otherwise enter an absolute executable or JavaScript entry-point path without arguments. Standard Windows npm/pnpm `.cmd` launchers resolve to their entry point without running a command shell. Custom shell scripts and PowerShell wrappers are unsupported.

Each provider retains its own optional model override and executable path. Examples are `sonnet` for Claude Code and `provider/model` selectors for OpenCode, Pi and OMP; valid names depend on your installation. Blank uses the provider's default selection. Codex starts without its user config so project instructions, hooks and MCP servers cannot enter a generation request; set a model override when you want a particular Codex model. Claude similarly excludes user/project settings while retaining its normal authentication. CLI environment and managed configuration can still affect providers. Pi, OMP and OpenCode retain normal provider/model configuration with invocation-specific tool restrictions.

**Detect installed CLIs** runs version probes only. Installed does not mean authenticated or model-ready. **Test selected CLI** sends a short `MOTIF_OK` prompt using the displayed, possibly unsaved configuration; it may consume provider quota. Neither button saves settings. Save explicitly when ready. Missing executables, unsupported output, failed authentication, unreachable models, quotas, excessive output and timeouts produce errors without switching providers or substituting templates.

The app and workspace remain local, but the selected CLI may send prompts, brand context, website excerpts and requested creative copy to its configured cloud service. CLI providers are opt-in; existing local-server settings remain the default and are retained when switching back. CLI tools are disabled/restricted, requests use fresh temporary directories and stdin, and prompts never become shell arguments. No permission-bypass flags are used. Temporary request directories are removed after completion or cancellation. Codex, Claude, Pi and OMP use ephemeral sessions; OpenCode can retain its own sessions/logs under its normal data directory. CLI authentication refreshes and provider-side logging remain controlled by the CLI/provider.

Child-process output is bounded to 1 MB, diagnostic buffering to 16 KB (1 MB diagnostic stream limit), prompts to 700 KB, and requests to two minutes or five minutes for larger design tasks. The research scan's existing 75-second deadline and abort signal also stop its CLI process tree. Provider error text is classified into safe messages; raw diagnostics, credentials and prompts are not returned by the API. Token budgets are instructions to the CLI model, not a guaranteed provider billing cap.

Compatibility verified here on Windows with Codex 0.159.3, Claude Code 2.1.316, OpenCode 2.0.32, Pi 1.4.0 and OMP 18.13.3. OpenCode 1.x has a separately tested invocation/configuration branch; it was not installed for a live test. Older CLIs missing required flags fail rather than retrying with broader permissions. POSIX process-group termination is implemented but was not exercised on this Windows machine.

Live checks used a tiny generic JSON prompt, without user brand data:

| CLI | Result |
| --- | --- |
| Codex | Valid JSON response |
| Claude Code | Valid JSON response |
| OpenCode | Provider reached; authentication failed with HTTP 401 |
| Pi | Configured Unsloth model unavailable: connection error |
| OMP | Configured Unsloth endpoint refused connection; bounded retry timed out |

Fixture tests exercise all five through actual child processes and the assistant, generation and research APIs, plus design/revision validation, errors, retry recovery and cancellation. Browser checks cover provider selection, separate profiles, detection, explicit testing, save/reload, assistant/research and responsive settings. These validate integration contracts; they do not establish production creative quality for every CLI model.

References used to verify invocation contracts: installed CLI help, [Claude Code CLI](https://code.claude.com/docs/en/cli-reference), [OpenCode CLI](https://opencode.ai/docs/cli/), [OpenCode v2 permissions](https://opencode.ai/v2/docs/permissions/), [Pi CLI](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md), and [OMP CLI](https://github.com/can1357/oh-my-pi). Exact routing, validation and process execution remain code; no additional semantic-routing service was added.
