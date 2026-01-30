# Waveland

Real-time code collaboration that works with any editor. Like Google Docs, but for coding.

<video src="demo.mp4"
       width="720"
       muted
       autoplay
       loop
       playsinline
       controls></video>


## Quick Start

**Install:**

```bash
curl -sSf https://raw.githubusercontent.com/go-johnnyhe/waveland/main/install.sh | sh
```

**Start a session:**

```bash
waveland start .
```

**Join a session:**

```bash
waveland join <session-url>
```

**First-time Vim/Neovim users, run:**

```bash
waveland vimSetup
```

## How it works

1. Run `waveland start filename.py` in your project
2. Share the generated URL 
3. Your partner runs `waveland join <url>`
4. Both see live changes with `→` and `←` indicators

Works with Vim, Neovim, VS Code, JetBrains, or any editor.

## Why Waveland?

Screensharing is clunky. Git is too slow for real-time work. Live Share only works in VS Code.

Waveland syncs files directly—use whatever editor you want.

## Use Cases

- Mock interviews
- Pair programming
- Debug sessions  
- Code reviews

## Limitations

- Repos >100 MB not optimized yet
- Last write wins (no merge conflicts)

---

Built with Go + WebSockets + Cloudflared. Open source.
