package email

import (
	"bytes"
	"crypto/tls"
	"embed"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"github.com/Reactguru24/lumiafrica/internal/config"
)

//go:embed templates/*.html
var templateFS embed.FS

type VendorApprovedEmailData struct {
	StoreName        string
	ApplicantEmail   string
	VendorLoginEmail string
	ResetURL         string
	Year             int
}

type PasswordResetEmailData struct {
	FullName string
	ResetURL string
	Year     int
}

type Mailer struct {
	cfg *config.Config
}

func NewMailer(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) Enabled() bool {
	return strings.TrimSpace(m.cfg.SMTPHost) != "" && strings.TrimSpace(m.cfg.SMTPFromEmail) != ""
}

func LogSMTPStatus(cfg *config.Config) {
	if strings.TrimSpace(cfg.SMTPHost) == "" || strings.TrimSpace(cfg.SMTPFromEmail) == "" {
		log.Println("[EMAIL] SMTP not configured — emails will be logged only")
		return
	}
	hasPassword := strings.TrimSpace(cfg.SMTPPassword) != ""
	log.Printf("[EMAIL] SMTP ready: %s:%d as %s (password set: %v)", cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, hasPassword)
}

func (m *Mailer) SendVendorApproved(to string, data VendorApprovedEmailData) error {
	if data.Year == 0 {
		data.Year = time.Now().Year()
	}

	subject := fmt.Sprintf("Your vendor application for %s was approved — Lumi Africa", data.StoreName)
	body, err := renderTemplate("templates/vendor_approved.html", data)
	if err != nil {
		return err
	}

	if !m.Enabled() {
		log.Printf("[EMAIL] SMTP not configured — would send to %s: %s", to, subject)
		if data.ResetURL != "" {
			log.Printf("[EMAIL] Vendor activation link: %s", data.ResetURL)
		}
		return nil
	}

	return m.send(to, subject, body)
}

func (m *Mailer) SendPasswordReset(to string, data PasswordResetEmailData) error {
	if data.Year == 0 {
		data.Year = time.Now().Year()
	}

	subject := "Reset your Lumi Africa password"
	body, err := renderTemplate("templates/password_reset.html", data)
	if err != nil {
		return err
	}

	if !m.Enabled() {
		log.Printf("[EMAIL] SMTP not configured — would send to %s: %s", to, subject)
		if data.ResetURL != "" {
			log.Printf("[EMAIL] Password reset link: %s", data.ResetURL)
		}
		return nil
	}

	return m.send(to, subject, body)
}

func (m *Mailer) send(to, subject, htmlBody string) error {
	if !m.Enabled() {
		log.Printf("[EMAIL] SMTP not configured — would send to %s: %s", to, subject)
		return nil
	}

	from := m.cfg.SMTPFromEmail
	fromName := strings.TrimSpace(m.cfg.SMTPFromName)
	if fromName == "" {
		fromName = "Lumi Africa"
	}

	var msg bytes.Buffer
	msg.WriteString(fmt.Sprintf("From: %s <%s>\r\n", fromName, from))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", to))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)

	addr := fmt.Sprintf("%s:%d", m.cfg.SMTPHost, m.cfg.SMTPPort)
	if err := sendMail(addr, m.cfg.SMTPHost, m.cfg.SMTPUser, m.cfg.SMTPPassword, from, []string{to}, msg.Bytes()); err != nil {
		log.Printf("[EMAIL] SMTP send failed to %s: %v", to, err)
		return err
	}
	return nil
}

func sendMail(addr, host, username, password, from string, to []string, msg []byte) error {
	conn, err := net.DialTimeout("tcp", addr, 15*time.Second)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: host}); err != nil {
			return err
		}
	}

	if username != "" {
		auth := smtp.PlainAuth("", username, password, host)
		if err := client.Auth(auth); err != nil {
			return err
		}
	}

	if err := client.Mail(from); err != nil {
		return err
	}
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}

	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func renderTemplate(name string, data any) (string, error) {
	raw, err := templateFS.ReadFile(name)
	if err != nil {
		return "", err
	}
	tmpl, err := template.New(name).Parse(string(raw))
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func BuildResetURL(cfg *config.Config, token string, vendorActivation bool) string {
	base := strings.TrimRight(cfg.FrontendURL, "/")
	url := fmt.Sprintf("%s/auth/reset-password?token=%s", base, token)
	if vendorActivation {
		url += "&vendor=1"
	}
	return url
}

func ParseSMTPPort(value string) int {
	port, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || port <= 0 {
		return 587
	}
	return port
}
