package handlers

import (
    "log"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

type wsPayload struct {
    Type    string `json:"type"`
    Message string `json:"message,omitempty"`
    Name    string `json:"name,omitempty"`
    Email   string `json:"email,omitempty"`
    Subject string `json:"subject,omitempty"`
    ID      string `json:"id,omitempty"`
    TS      string `json:"ts,omitempty"`
}

// SupportWS upgrades the connection to a WebSocket and echoes/acknowledges messages.
func SupportWS() gin.HandlerFunc {
    return func(c *gin.Context) {
        conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
        if err != nil {
            log.Printf("ws upgrade: %v", err)
            return
        }
        defer conn.Close()

        // send a welcome message
        welcome := wsPayload{Type: "message", Message: "Connected to support chat", TS: time.Now().Format(time.RFC3339)}
        _ = conn.WriteJSON(welcome)

        for {
            var p wsPayload
            if err := conn.ReadJSON(&p); err != nil {
                if websocket.IsCloseError(err, websocket.CloseNormalClosure) {
                    return
                }
                log.Printf("ws read error: %v", err)
                return
            }

            // simple acknowledgement: respond as support
            ack := wsPayload{
                Type:    "message",
                Message: "Thanks — we've received your message and will follow up via email.",
                TS:      time.Now().Format(time.RFC3339),
            }
            // optional echo of customer text in logs
            if p.Message != "" {
                log.Printf("support ws received from %s <%s>: %s", p.Name, p.Email, p.Message)
            }

            if err := conn.WriteJSON(ack); err != nil {
                log.Printf("ws write error: %v", err)
                return
            }
        }
    }
}
