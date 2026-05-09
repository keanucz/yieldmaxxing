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
)

func main() {
	cfg := config.Load()

	if err := db.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	handlers.InitJobs(cfg)
	handlers.InitSatellite(cfg)

	app := fiber.New(fiber.Config{AppName: "YieldMaxxing API"})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Content-Type,Authorization",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Static("/data", "./data", fiber.Static{ByteRange: true})

	api := app.Group("/api")
	api.Get("/geocode", handlers.Geocode)
	api.Get("/fields", handlers.GetFields)
	api.Post("/jobs", handlers.CreateJob)
	api.Get("/jobs", handlers.ListJobs)
	api.Get("/jobs/:id", handlers.GetJob)
	api.Post("/jobs/:id/annotations", handlers.SubmitAnnotations)

	// Satellite — served by Go, consumed directly by frontend
	sat := api.Group("/satellite")
	sat.Get("/ndvi", handlers.GetNDVI)
	sat.Get("/rgb", handlers.GetRGB)

	log.Printf("YieldMaxxing API listening on :%s", cfg.Port)
	if err := app.Listen("0.0.0.0:" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
