package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hackathon/cropguard/sentinel"
)

var countyToCrome = map[string]string{
	"bedfordshire":         "Crop_Map_of_England_2025_Bedfordshire",
	"berkshire":            "Crop_Map_of_England_2025_Berkshire",
	"bristol":              "Crop_Map_of_England_2025_Bristol",
	"buckinghamshire":      "Crop_Map_of_England_2025_Buckinghamshire",
	"cambridgeshire":       "Crop_Map_of_England_2025_Cambridgeshire",
	"cheshire":             "Crop_Map_of_England_2025_Cheshire",
	"cornwall":             "Crop_Map_of_England_2025_Cornwall",
	"cumbria":              "Crop_Map_of_England_2025_Cumbria",
	"derbyshire":           "Crop_Map_of_England_2025_Derbyshire",
	"devon":                "Crop_Map_of_England_2025_Devon",
	"dorset":               "Crop_Map_of_England_2025_Dorset",
	"durham":               "Crop_Map_of_England_2025_Durham",
	"east riding of yorkshire": "Crop_Map_of_England_2025_EastRidingofYorkshire",
	"east sussex":          "Crop_Map_of_England_2025_EastSussex",
	"essex":                "Crop_Map_of_England_2025_Essex",
	"gloucestershire":      "Crop_Map_of_England_2025_Gloucestershire",
	"greater manchester":   "Crop_Map_of_England_2025_GreaterManchester",
	"hampshire":            "Crop_Map_of_England_2025_Hampshire",
	"herefordshire":        "Crop_Map_of_England_2025_Herefordshire",
	"hertfordshire":        "Crop_Map_of_England_2025_Hertfordshire",
	"isle of wight":        "Crop_Map_of_England_2025_IsleofWight",
	"kent":                 "Crop_Map_of_England_2025_Kent",
	"lancashire":           "Crop_Map_of_England_2025_Lancashire",
	"leicestershire":       "Crop_Map_of_England_2025_Leicestershire",
	"lincolnshire":         "Crop_Map_of_England_2025_Lincolnshire",
	"merseyside":           "Crop_Map_of_England_2025_Merseyside",
	"norfolk":              "Crop_Map_of_England_2025_Norfolk",
	"north yorkshire":      "Crop_Map_of_England_2025_NorthYorkshire",
	"northamptonshire":     "Crop_Map_of_England_2025_Northamptonshire",
	"northumberland":       "Crop_Map_of_England_2025_Northumberland",
	"nottinghamshire":      "Crop_Map_of_England_2025_Nottinghamshire",
	"oxfordshire":          "Crop_Map_of_England_2025_Oxfordshire",
	"rutland":              "Crop_Map_of_England_2025_Rutland",
	"shropshire":           "Crop_Map_of_England_2025_Shropshire",
	"south yorkshire":      "Crop_Map_of_England_2025_SouthYorkshire",
	"staffordshire":        "Crop_Map_of_England_2025_Staffordshire",
	"suffolk":              "Crop_Map_of_England_2025_Suffolk",
	"surrey":               "Crop_Map_of_England_2025_Surrey",
	"tyne and wear":        "Crop_Map_of_England_2025_TyneandWear",
	"warwickshire":         "Crop_Map_of_England_2025_Warwickshire",
	"west midlands":        "Crop_Map_of_England_2025_WestMidlands",
	"west sussex":          "Crop_Map_of_England_2025_WestSussex",
	"west yorkshire":       "Crop_Map_of_England_2025_WestYorkshire",
	"wiltshire":            "Crop_Map_of_England_2025_Wiltshire",
	"worcestershire":       "Crop_Map_of_England_2025_Worcestershire",
}

const cromeBaseURL = "https://environment.data.gov.uk/spatialdata/crop-map-of-england-2025/ogc/features/v1/collections"

type FieldsRequest struct {
	Lat      float64 `query:"lat"`
	Lon      float64 `query:"lon"`
	RadiusKm float64 `query:"radius_km"`
	County   string  `query:"county"`
	Limit    int     `query:"limit"`
}

func GetFields(c *fiber.Ctx) error {
	var req FieldsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.Lat == 0 && req.Lon == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "lat and lon required"})
	}
	if req.RadiusKm <= 0 {
		req.RadiusKm = 0.5
	}
	if req.RadiusKm > 5 {
		req.RadiusKm = 5
	}
	if req.Limit <= 0 {
		req.Limit = 200
	}
	if req.Limit > 1000 {
		req.Limit = 1000
	}

	county := strings.ToLower(strings.TrimSpace(req.County))
	collection, ok := countyToCrome[county]
	if !ok {
		collection = guessCollection(req.Lat, req.Lon)
	}
	if collection == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "county required — pass county name or ensure postcode resolves to a known English county",
		})
	}

	bbox := sentinel.BBoxFromPoint(req.Lat, req.Lon, req.RadiusKm)
	bboxStr := fmt.Sprintf("%.6f,%.6f,%.6f,%.6f", bbox.West, bbox.South, bbox.East, bbox.North)

	apiURL := fmt.Sprintf("%s/%s/items?bbox=%s&limit=%d&f=json",
		cromeBaseURL, url.PathEscape(collection), bboxStr, req.Limit)

	ctx, cancel := context.WithTimeout(c.Context(), 15*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "request build failed"})
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "CROME API unreachable"})
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		errBody, _ := io.ReadAll(resp.Body)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":  "CROME API error",
			"detail": string(errBody),
		})
	}

	var geojson json.RawMessage
	body, _ := io.ReadAll(resp.Body)
	geojson = body

	c.Set("Content-Type", "application/geo+json")
	return c.Send(geojson)
}

func guessCollection(lat, lon float64) string {
	_ = lon
	if lat > 53.5 {
		return "Crop_Map_of_England_2025_NorthYorkshire"
	}
	if lat > 52.5 {
		return "Crop_Map_of_England_2025_Lincolnshire"
	}
	if lat > 51.5 {
		return "Crop_Map_of_England_2025_Cambridgeshire"
	}
	return "Crop_Map_of_England_2025_Hampshire"
}
