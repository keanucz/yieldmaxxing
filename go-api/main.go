package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/hackathon/cropguard/config"
	"github.com/hackathon/cropguard/db"
	"github.com/hackathon/cropguard/handlers"
	"github.com/hackathon/cropguard/middleware"
)

func main() {
	cfg := config.Load()

	if err := db.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	handlers.InitAuth(cfg)
	handlers.InitJobs(cfg)
	handlers.InitSatellite(cfg)

	app := fiber.New(fiber.Config{
		AppName: "YieldMaxxing API",
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AppURL,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Content-Type,Authorization",
		AllowCredentials: true,
	}))

	// Health check (unprotected)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Geocode + fields (unprotected — frontend needs these before auth)
	app.Get("/api/geocode", handlers.Geocode)
	app.Get("/api/fields", handlers.GetFields)

	// Static data (PMTiles, etc) — unprotected for vector tile fetching
	app.Static("/data", "./data", fiber.Static{
		ByteRange: true,
	})

	// Auth routes (unprotected)
	auth := app.Group("/auth")
	auth.Get("/login", handlers.GoogleLogin)
	auth.Get("/callback", handlers.GoogleCallback)
	auth.Post("/logout", handlers.Logout)

	// Protected API routes
	api := app.Group("/api", middleware.AuthRequired(cfg.JWTSecret))
	api.Get("/me", handlers.GetMe)
	api.Post("/jobs", handlers.CreateJob)
	api.Get("/jobs", handlers.ListJobs)
	api.Get("/jobs/:id", handlers.GetJob)
	api.Post("/jobs/:id/annotations", handlers.SubmitAnnotations)

	// Satellite endpoints (protected)
	sat := app.Group("/api/satellite", middleware.AuthRequired(cfg.JWTSecret))
	sat.Get("/ndvi", handlers.GetNDVI)
	sat.Get("/rgb", handlers.GetRGB)

	log.Printf("YieldMaxxing API listening on :%s", cfg.Port)
	if err := app.Listen("0.0.0.0:" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
