package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/hackathon/cropguard/config"
	"github.com/hackathon/cropguard/db"
	"github.com/hackathon/cropguard/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var oauthConfig *oauth2.Config
var appConfig *config.Config

func InitAuth(cfg *config.Config) {
	appConfig = cfg
	oauthConfig = &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func GoogleLogin(c *fiber.Ctx) error {
	url := oauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	return c.Redirect(url, fiber.StatusTemporaryRedirect)
}

func GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing code parameter"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	token, err := oauthConfig.Exchange(ctx, code)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": fmt.Sprintf("oauth exchange failed: %v", err),
		})
	}

	userInfo, err := fetchGoogleUserInfo(ctx, token.AccessToken)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("failed to get user info: %v", err),
		})
	}

	user, err := upsertUser(ctx, userInfo)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("failed to save user: %v", err),
		})
	}

	sessionID, err := createSession(ctx, user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create session"})
	}

	c.Cookie(&fiber.Cookie{
		Name:     "session",
		Value:    sessionID,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		Path:     "/",
	})

	return c.Redirect(appConfig.AppURL, fiber.StatusTemporaryRedirect)
}

func Logout(c *fiber.Ctx) error {
	sessionID := c.Cookies("session")
	if sessionID != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		db.Pool.Exec(ctx, "DELETE FROM sessions WHERE id = $1", sessionID)
	}

	c.Cookie(&fiber.Cookie{
		Name:     "session",
		Value:    "",
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
		Expires:  time.Now().Add(-1 * time.Hour),
		Path:     "/",
	})
	return c.JSON(fiber.Map{"message": "logged out"})
}

func GetMe(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := db.Pool.QueryRow(ctx,
		"SELECT id, email, name, avatar_url, provider, created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.Provider, &user.CreatedAt)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	return c.JSON(user)
}

// --- helpers ---

type googleUserInfo struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Picture  string `json:"picture"`
	Sub      string `json:"sub"`
	Verified bool   `json:"email_verified"`
}

func fetchGoogleUserInfo(ctx context.Context, accessToken string) (*googleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

func upsertUser(ctx context.Context, info *googleUserInfo) (*models.User, error) {
	var user models.User
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO users (id, email, name, avatar_url, provider)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (email) DO UPDATE SET
		   name = EXCLUDED.name,
		   avatar_url = EXCLUDED.avatar_url
		 RETURNING id, email, name, avatar_url, provider, created_at`,
		uuid.New().String(), info.Email, info.Name, info.Picture, "google",
	).Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.Provider, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert user: %w", err)
	}
	return &user, nil
}

func createSession(ctx context.Context, userID string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	sessionID := hex.EncodeToString(b)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	_, err := db.Pool.Exec(ctx,
		"INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
		sessionID, userID, expiresAt,
	)
	if err != nil {
		return "", fmt.Errorf("failed to insert session: %w", err)
	}
	return sessionID, nil
}
