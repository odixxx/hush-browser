<div align="center">
  <img src=".github/assets/logo.png" width="96" height="96" alt="Hush Browser" />

  <h1>Hush Browser</h1>

  <p><strong>Stealth antidetect browser with native Model Context Protocol (MCP) for AI agents and operators.</strong></p>

  <p>
    Local Chromium and Firefox profiles with isolated cookies, fingerprints, and proxies.<br/>
    Drive them seamlessly through MCP from Hermes Agent, Claude Desktop, Cursor, or any MCP client.
  </p>

  <p>
    <a href="https://github.com/odixxx/hush-browser/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/odixxx/hush-browser?style=for-the-badge&color=8b5cf6&labelColor=0a0b0f"></a>
    <a href="https://github.com/odixxx/hush-browser/blob/master/LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/odixxx/hush-browser?style=for-the-badge&color=ec4899&labelColor=0a0b0f"></a>
    <a href="https://github.com/odixxx/hush-browser/actions/workflows/release.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/odixxx/hush-browser/release.yml?style=for-the-badge&labelColor=0a0b0f"></a>
    <a href="https://github.com/odixxx/hush-browser/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/odixxx/hush-browser/total?style=for-the-badge&color=3b82f6&labelColor=0a0b0f"></a>
    <a href="https://github.com/odixxx/hush-browser/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/odixxx/hush-browser?style=for-the-badge&color=ff6b35&labelColor=0a0b0f"></a>
  </p>
</div>

---

## Overview

**Hush Browser** is an open-source stealth browser platform designed for autonomous AI agents and human operators. Each profile runs in full isolation with its own persistent cookies, storage, fingerprint, and proxy configuration.

Instead of heavy external automation frameworks or unstable browser extensions, Hush Browser integrates a native **Model Context Protocol (MCP)** server directly on `127.0.0.1:7777` (supporting both Streamable HTTP and SSE). AI agents can launch profiles, navigate pages, inspect accessibility trees, type text, click elements, extract data, manage cookies, and solve complex multi-step workflows with zero overhead.

## Key Features

- **Multi-Engine Stealth Architecture**: Choose between **CloakBrowser** (hardened Chromium) or **Camoufox** (stealth Firefox) with deep C++ level fingerprint injection.
- **Native MCP Server (22 Tools)**: Direct control plane for LLMs — `launch_profile`, `close_profile`, `navigate`, `extract`, `click`, `type`, `evaluate_js`, `screenshot`, `get_cookies`, `set_cookies`, `wait_for_selector`, etc.
- **24 Curated Realistic Profiles**: Out-of-the-box hardware fingerprints including Apple Silicon M4 / M2 Ultra, NVIDIA RTX 4090 / 4070, Intel Core Ultra, Snapdragon X Elite, and international locales.
- **Headless Daemon Mode (`--daemon`)**: Run on Linux servers, VPS, or background nodes with **0.0% CPU overhead** while maintaining native GPU acceleration for spawned profile windows.
- **Proxy Management**: Per-profile SOCKS5, HTTP, and HTTPS proxy routing with automatic failover and geolocation detection.
- **Extensions & CRX Pipeline**: Support for Chrome extensions with runtime RSA-key injection.
- **Complete Privacy & Local Ownership**: Zero mandatory cloud accounts, no external telemetry leaks, 100% local storage of profile data.

---

## Quick Start

### Installation

Download the latest binaries for Linux, macOS, and Windows from the [Releases](https://github.com/odixxx/hush-browser/releases/latest) page.

#### Linux (AppImage & Tarball)
```bash
curl -LO https://github.com/odixxx/hush-browser/releases/latest/download/Hush-Browser-linux-x86_64.AppImage
chmod +x Hush-Browser-linux-x86_64.AppImage
./Hush-Browser-linux-x86_64.AppImage
```

#### Headless / Server Mode (Linux Daemon)
To run Hush Browser as a system service or headless background MCP provider:
```bash
./hush-browser --no-sandbox --daemon
```
The daemon runs quietly in the background without allocating virtual Xvfb buffers or software renderers, consuming **0.0% CPU** in standby.

---

## MCP Server Configuration

When Hush Browser starts, it generates a bearer token at `~/.config/Hush Browser/mcp-token` and serves the MCP endpoint on port `7777`.

### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "hush-browser": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "http://127.0.0.1:7777/mcp"],
      "env": {
        "HUSH_TOKEN": "<YOUR_MCP_TOKEN>"
      }
    }
  }
}
```

### Hermes Agent / Remote HTTP
Connect directly via Streamable HTTP:
- **URL**: `http://<HOST>:7777/mcp`
- **Header**: `Authorization: Bearer <TOKEN>`

---

## Available MCP Tools

| Tool | Description |
| :--- | :--- |
| `list_profiles` | Lists all local browser profiles and active status |
| `launch_profile` | Launches an isolated browser profile with configured proxy and fingerprint |
| `close_profile` | Shuts down an active profile instance |
| `navigate` | Directs the profile browser to target URL |
| `extract` | Captures page snapshot: accessibility DOM tree, title, and URL |
| `click` | Triggers mouse clicks by CSS selector or coordinates |
| `type` | Simulates human keyboard typing into input elements |
| `evaluate_js` | Evaluates arbitrary JavaScript in page context |
| `screenshot` | Captures high-resolution viewport or element screenshots |
| `get_cookies` / `set_cookies` | Manages persistent profile cookies directly |
| `wait_for_selector` | Synchronizes automation waiting for dynamic DOM elements |

---

## Building from Source

Requirements: Node.js 20+, Yarn, and build dependencies.

```bash
git clone https://github.com/odixxx/hush-browser.git
cd hush-browser

# Install dependencies
yarn install

# Run desktop app in development
yarn dev

# Build release packages
yarn build
```

---

## License

Distributed under the [MIT License](LICENSE).
