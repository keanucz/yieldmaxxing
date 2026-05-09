package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hackathon/cropguard/config"
	"github.com/hackathon/cropguard/sentinel"
)

var shClient *sentinel.Client

func InitSatellite(cfg *config.Config) {
	if cfg.SHClientID != "" && cfg.SHClientSecret != "" {
		shClient = sentinel.NewClient(cfg.SHClientID, cfg.SHClientSecret)
	}
}

type NDVIRequest struct {
	Lat       float64 `json:"lat" query:"lat"`
	Lon       float64 `json:"lon" query:"lon"`
	RadiusKm  float64 `json:"radius_km" query:"radius_km"`
	DateStart string  `json:"date_start" query:"date_start"`
	DateEnd   string  `json:"date_end" query:"date_end"`
	Width     int     `json:"width" query:"width"`
	Height    int     `json:"height" query:"height"`
}

func GetNDVI(c *fiber.Ctx) error {
	if shClient == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "sentinel hub not configured"})
	}

	var req NDVIRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.Lat == 0 && req.Lon == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "lat and lon required"})
	}
	if req.RadiusKm <= 0 {
		req.RadiusKm = 1.0
	}
	if req.Width <= 0 {
		req.Width = 512
	}
	if req.Height <= 0 {
		req.Height = 512
	}
	if req.DateEnd == "" {
		req.DateEnd = time.Now().Format("2006-01-02")
	}
	if req.DateStart == "" {
		req.DateStart = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}

	bbox := sentinel.BBoxFromPoint(req.Lat, req.Lon, req.RadiusKm)

	ctx, cancel := context.WithTimeout(c.Context(), 30*time.Second)
	defer cancel()

	png, err := shClient.FetchNDVI(ctx, bbox, req.DateStart, req.DateEnd, req.Width, req.Height)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "image/png")
	c.Set("X-BBox", bbox.String())
	return c.Send(png)
}

func GetRGB(c *fiber.Ctx) error {
	if shClient == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "sentinel hub not configured"})
	}

	var req NDVIRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.Lat == 0 && req.Lon == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "lat and lon required"})
	}
	if req.RadiusKm <= 0 {
		req.RadiusKm = 1.0
	}
	if req.Width <= 0 {
		req.Width = 512
	}
	if req.Height <= 0 {
		req.Height = 512
	}
	if req.DateEnd == "" {
		req.DateEnd = time.Now().Format("2006-01-02")
	}
	if req.DateStart == "" {
		req.DateStart = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}

	bbox := sentinel.BBoxFromPoint(req.Lat, req.Lon, req.RadiusKm)

	ctx, cancel := context.WithTimeout(c.Context(), 30*time.Second)
	defer cancel()

	png, err := shClient.FetchRGB(ctx, bbox, req.DateStart, req.DateEnd, req.Width, req.Height)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "image/png")
	c.Set("X-BBox", bbox.String())
	return c.Send(png)
}
