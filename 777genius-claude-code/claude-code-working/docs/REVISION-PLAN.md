# Documentation revision plan

> Goal: Supplement source code level insights and upgrade each document from "concept science popularization" to "reverse engineering white paper" level.

---

## First echelon: empty shell pages, need to be significantly rewritten

### 1. `safety/sandbox.mdx` — Sandbox mechanism ✅ DONE

**Current situation**: 35 lines, only four dimensions of "file system/network/process/time" are listed, without any implementation details.

**Correction direction**:
- Supplement the actual calling method of macOS `sandbox-exec` and show the key fragments of the sandbox profile
- Explain the decision logic of `getSandboxConfig()`: which commands are sandboxed and which are skipped
- Added design tradeoffs for `dangerouslyDisableSandbox` parameter
- Added sandbox difference comparison on Linux platform (seatbelt vs namespace)
- Show the complete link of a command execution from permission check → sandbox package → actual execution

---

### 2. `introduction/what-is-claude-code.mdx` — What is Claude Code ✅ DONE

**Current situation**: 39 lines, pure marketing copy, and the comparison table with "normal chat AI" is too low-level.

**Correction direction**:
- Cut off the general list of "what can be done" and replace it with a specific end-to-end example (from user input → system processing → final output)
- Use a simplified architecture diagram instead of text description to allow readers to build intuition in 30 seconds
- Supplement the technical positioning of Claude Code: not an IDE plug-in, not a Web Chat, but a terminal-native agentic system
- Add positioning differences with tools such as Cursor / Copilot / Aider (architectural level rather than function list)

---

### 3. `introduction/why-this-whitepaper.mdx` — Why write this white paper ✅ DONE

**Status quo**: 40 lines, all empty talk, four cards that are just previews of subsequent chapter titles.

**Correction direction**:
- Clear positioning: This is a reverse engineering analysis of Anthropic's official CLI, not an official document
- List the 3-5 most unexpected/ingenious design decisions discovered during the reverse engineering process (to whet the reader’s appetite)
- Explain the reading road map of the white paper: the recommended reading order and what problems each chapter solves
- Supplement "What this white paper is not" - not a tutorial, not an API document

---

### 4. `safety/why-safety-matters.mdx` — Why Safety Matters ✅ DONE

**Current situation**: 40 lines, only obvious risks are listed, and there are only 3 bullets for "balance of safety vs. efficiency".

**Correction direction**:
- Shows a panoramic view of the security system from the source code perspective: Permission rules → Sandbox → Plan Mode → Budget limit → Hooks’ defense chain in depth
- Supplement the safety instructions in Claude's own System Prompt ("Confirm before execution", "Prioritize reversible operations", etc.) to demonstrate the security constraints on the AI side
- Use real scenarios to illustrate the engineering trade-off of "security vs. efficiency": for example, why the Read tool is exempt from approval, and why the Bash tool requires item-by-item confirmation
- Added a brief description of Prompt Injection defense (how malicious content in the tool result is marked by the system)

---

## Second echelon: There is a skeleton but it is too shallow and needs to be filled with flesh.

### 5. `conversation/streaming.mdx` — streaming response ✅ DONE

**Current situation**: 43 lines, only saying "good streaming" and 3 lines of provider table.

**Correction direction**:
- Added the core event types and their meanings of `BetaRawMessageStreamEvent`
- Show the intertwined state machine flow of text chunk and tool_use block
- Explain error handling in streaming: network disconnection, API current limiting, retry/downgrade strategy when token exceeds limit
- Supplement the core logic of `processStreamEvents()`: how to separate text, tool calls, and usage statistics from the event stream

---

### 6. `tools/search-and-navigation.mdx` — Search and Navigation ✅ DONE

**Status quo**: 43 lines, only saying that Glob and Grep exist.

**Correction direction**:
- Added ripgrep binary embedding method (vendor directory, platform adaptation)
- Explain the design reasons for the default head_limit of 250 for search results (token budget)
- Demonstrates the implementation of ToolSearch: how to use semantic matching to find the most relevant tools among 50+ tools (including MCP)
- Added meaning of Glob sorting by modification time: recently modified files are most likely to be relevant to the current task

---

### 7. `tools/task-management.mdx` — Task Management ✅ DONE

**Current situation**: 50 lines, only 4 bullets for process steps and status display.

**Correction direction**:
- Supplementary task data model: id/subject/description/status/blockedBy/blocks/owner
- Explain the implementation of dependency management: how blockedBy prevents tasks from being claimed, and how to automatically unlock the downstream after completing a task
- Show the linkage between tasks and Agent tools: how sub-Agents claim tasks and report progress
- Supplement the UX design of the activeForm field: spinner animation copy for tasks in progress

---

### 8. `context/token-budget.mdx` — Token budget management ✅ DONE

**Current situation**: 55 lines, budget control only has 3 cards with one sentence each.

**Correction direction**:
- Added dynamic calculation logic of `contextWindowTokens` and `maxOutputTokens`
- Explain the placement strategy of cache breakpoints: the reason why unchanged content comes first and changed content comes last in System Prompt
- Show the specific mechanism of tool output truncation: how long results are truncated and when micro-compact is triggered
- Supplementary implementation of token counting: timing of calling `countTokens` and trade-off between approximate vs exact counting

---

### 9. `agent/worktree-isolation.mdx` — Worktree Isolation ✅ DONE

**Current situation**: 55 lines, only describing the concept of git worktree.

**Correction direction**:
- Show the directory structure and branch naming rules of `.claude/worktrees/`
- Explain the life cycle of worktree: creation time (`isolation: "worktree"`) → sub-Agent execution → completion/abandonment → automatic cleanup
- Supplement the binding relationship between worktree and sub-Agent: how to judge keep or remove when the Agent ends
- Added interaction design for EnterWorktree / ExitWorktree tools

---

### 10. `extensibility/custom-agents.mdx` — Custom Agent ✅ DONE

**Status quo**: 56 rows, only configuration table and sample table.

**Correction direction**:
- Show the complete frontmatter format of the agent markdown file (name / description / model / allowedTools, etc.)
- Explain how agents are loaded and injected into System Prompt: the discovery and merging logic of `loadAgentDefinitions()`
- Demonstrates the implementation of tool restrictions: allowedTools How to filter the tool list
- Added the relationship between agent and subagent_type parameters: how the Agent tool specifies the use of a custom Agent
