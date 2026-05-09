package middleware

import (
	"context"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hackathon/cropguard/db"
)

func AuthRequired(_ string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if os.Getenv("DEV_BYPASS_AUTH") == "1" {
			c.Locals("user_id", "dev-user-000")
			c.Locals("email", "dev@localhost")
			c.Locals("name", "Dev User")
			return c.Next()
		}

		sessionID := c.Cookies("session")
		if sessionID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "no session cookie",
			})
		}

		ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
		defer cancel()

		var userID, email, name string
		err := db.Pool.QueryRow(ctx,
			`SELECT s.user_id, u.email, u.name
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = $1 AND s.expires_at > NOW()`,
			sessionID,
		).Scan(&userID, &email, &name)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired session",
			})
		}

		c.Locals("user_id", userID)
		c.Locals("email", email)
		c.Locals("name", name)
		return c.Next()
	}
}
