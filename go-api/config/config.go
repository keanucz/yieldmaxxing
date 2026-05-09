package config

import "os"

type Config struct {
	DatabaseURL        string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	JWTSecret          string
	AppURL             string
	PublicURL          string // this API's own public URL, passed to Python so it can build satellite image URLs
	AgentServiceURL    string
	Port               string
	SHClientID         string
	SHClientSecret     string
}

func Load() *Config {
	cfg := &Config{
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://yieldmaxxing:yieldmaxxing@postgres:5432/yieldmaxxing"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/callback"),
		JWTSecret:          getEnv("JWT_SECRET", "dev-secret-change-me"),
		AppURL:             getEnv("APP_URL", "http://localhost:3000"),
		PublicURL:          getEnv("PUBLIC_URL", "http://localhost:8080"),
		AgentServiceURL:    getEnv("AGENT_SERVICE_URL", "http://python-agents:8001"),
		Port:               getEnv("PORT", "8080"),
		SHClientID:         getEnv("SH_CLIENT_ID", ""),
		SHClientSecret:     getEnv("SH_CLIENT_SECRET", ""),
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
