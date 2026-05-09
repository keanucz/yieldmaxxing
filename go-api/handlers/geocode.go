package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hackathon/cropguard/sentinel"
)

type GeocodeResponse struct {
	Postcode string       `json:"postcode"`
	Lat      float64      `json:"lat"`
	Lon      float64      `json:"lon"`
	BBox     sentinel.BBox `json:"bbox"`
	District string       `json:"district"`
	County   string       `json:"county"`
}

func Geocode(c *fiber.Ctx) error {
	postcode := c.Query("postcode")
	if postcode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "postcode query param required"})
	}

	postcode = strings.ReplaceAll(strings.TrimSpace(postcode), " ", "")

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("https://api.postcodes.io/postcodes/%s", postcode), nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to build request"})
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "postcodes.io unreachable"})
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "postcode not found"})
	}
	if resp.StatusCode != 200 {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "postcodes.io error"})
	}

	body, _ := io.ReadAll(resp.Body)

	var parsed struct {
		Result struct {
			Postcode          string  `json:"postcode"`
			Latitude          float64 `json:"latitude"`
			Longitude         float64 `json:"longitude"`
			AdminDistrict     string  `json:"admin_district"`
			AdminCounty       string  `json:"admin_county"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "bad postcodes.io response"})
	}

	r := parsed.Result
	bbox := sentinel.BBoxFromPoint(r.Latitude, r.Longitude, 2.0)

	return c.JSON(GeocodeResponse{
		Postcode: r.Postcode,
		Lat:      r.Latitude,
		Lon:      r.Longitude,
		BBox:     bbox,
		District: r.AdminDistrict,
		County:   r.AdminCounty,
	})
}
