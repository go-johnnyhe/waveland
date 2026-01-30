# Port Configuration Implementation Plan

## Overview
Add `--port`/`-p` flag to `waveland start` command with auto-increment functionality when the default port is in use.

## Files to Modify

### 1. cmd/start.go

#### Add flag variable and modify command definition:

```go
var startPort int

var startCmd = &cobra.Command{
    Use:   "start <file>",
    Short: "Start a collaborative coding session and share files",
    Long: `Start a new collaborative coding session with instant file sharing.

This command will:
- Launch a WebSocket server for real-time collaboration
- Create a secure tunnel using Cloudflared (no setup required)
- Share the current directory or specified files with anyone who joins the session
- Generate a shareable URL for your coding partner

Example:
  waveland start main.py              # Share a single file
  waveland start .                    # Share current directory
  waveland start . --port 9090        # Use port 9090 (with auto-increment if in use)
  waveland start . -p 3000            # Shorthand for port flag

The generated URL can be shared with anyone - they can join using:
  waveland join <your-session-url>

Perfect for mock interviews, pair programming, and collaborative debugging.`,
    Run: func(cmd *cobra.Command, args []string) {
        // ... existing code ...
```

#### Add findAvailablePort helper function:

Add this function before the `init()` function:

```go
func findAvailablePort(startPort int) (int, net.Listener, error) {
    for port := startPort; port <= startPort+100; port++ {
        listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
        if err == nil {
            return port, listener, nil
        }
    }
    return 0, nil, fmt.Errorf("no available ports found between %d and %d", startPort, startPort+100)
}
```

#### Update imports:

Add `net` to imports:

```go
import (
    "context"
    "fmt"
    "net"
    "github.com/go-johnnyhe/waveland/server"
    "net/http"
    "os"
    "os/signal"
    "strings"
    "syscall"
    "time"
    "github.com/go-johnnyhe/waveland/internal/client"
    "github.com/go-johnnyhe/waveland/internal/tunnel"
    "github.com/gorilla/websocket"
    "github.com/spf13/cobra"
)
```

#### Replace server startup logic:

Replace lines 68-82 with:

```go
        // Find available port
        actualPort, listener, err := findAvailablePort(startPort)
        if err != nil {
            fmt.Printf("Failed to find available port: %v\n", err)
            os.Exit(1)
        }
        
        if actualPort != startPort {
            fmt.Printf("Port %d was in use, using port %d instead\n", startPort, actualPort)
        }

        // Create a context to link with a command line process so that when you stop, we know where to exit
        ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
        defer stop()
        
        // start server in go routine
        http.HandleFunc("/ws", server.StartServer)
        srv := &http.Server{}
        go func() {
            if err := srv.Serve(listener); err != http.ErrServerClosed {
                fmt.Printf("Server failed: %v\n", err)
                os.Exit(1)
            }
        }()
```

#### Update tunnel and client connection calls:

Replace line 88 (tunnel call):
```go
        tunnelURL, err := tunnel.StartCloudflaredTunnel(ctx, actualPort)
```

Replace line 91:
```go
            fmt.Printf("Server is running locally on localhost:%d\n", actualPort)
```

Replace line 109 (websocket dial):
```go
            conn, _, err := websocket.DefaultDialer.Dial(fmt.Sprintf("ws://localhost:%d/ws", actualPort), nil)
```

#### Add flag registration in init():

```go
func init() {
    rootCmd.AddCommand(startCmd)
    startCmd.Flags().IntVarP(&startPort, "port", "p", 8080, "Port to run the server on (will auto-increment if in use)")
}
```

### 2. internal/tunnel/cloudflared.go

#### Update function signature:

Change line 142 from:
```go
func StartCloudflaredTunnel(ctx context.Context) (string, error){
```

To:
```go
func StartCloudflaredTunnel(ctx context.Context, port int) (string, error){
```

#### Update command to use dynamic port:

Change line 149 from:
```go
    cmd := exec.CommandContext(ctx, binary, "tunnel", "--url", "localhost:8080")
```

To:
```go
    cmd := exec.CommandContext(ctx, binary, "tunnel", "--url", fmt.Sprintf("localhost:%d", port))
```

#### Update imports:

Ensure `fmt` is imported (it already should be).

## Testing Steps

1. Build the project:
   ```bash
   go build .
   ```

2. Test default port (8080):
   ```bash
   ./waveland start .
   ```

3. Test custom port:
   ```bash
   ./waveland start . --port 9090
   ```

4. Test shorthand:
   ```bash
   ./waveland start . -p 3000
   ```

5. Test auto-increment (run two instances):
   ```bash
   # Terminal 1
   ./waveland start . --port 8080
   
   # Terminal 2 (should auto-increment to 8081)
   ./waveland start . --port 8080
   ```

## Expected Behavior

- `waveland start .` → tries 8080, if in use tries 8081, 8082... up to 8180
- `waveland start . --port 9090` → tries 9090, if in use tries 9091, 9092...
- `waveland start . -p 3000` → tries 3000, if in use tries 3001, 3002...
- If no ports available in range, exits with error message
- Console output shows which port is actually being used
