package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
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

	// Use CROME 2024 (nationwide, no county routing needed) — falls back to 2025 per-county if set
	apiURL := fmt.Sprintf(
		"https://environment.data.gov.uk/spatialdata/crop-map-of-england-2024/ogc/features/v1/collections/Crop_Map_of_England_2024/items?bbox=%s&limit=%d&f=json",
		bboxStr, req.Limit)

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

	body, _ := io.ReadAll(resp.Body)

	merged, err := mergeHexCells(body)
	if err != nil {
		c.Set("Content-Type", "application/geo+json")
		return c.Send(body)
	}

	c.Set("Content-Type", "application/geo+json")
	return c.Send(merged)
}

type cromeFeatureCollection struct {
	Type     string         `json:"type"`
	Features []cromeFeature `json:"features"`
}

type cromeFeature struct {
	Type       string          `json:"type"`
	ID         string          `json:"id,omitempty"`
	Geometry   cromeGeometry   `json:"geometry"`
	Properties cromeProperties `json:"properties"`
}

type cromeGeometry struct {
	Type        string        `json:"type"`
	Coordinates [][][2]float64 `json:"coordinates"`
}

type cromeProperties struct {
	CromeID string  `json:"cromeid"`
	Lucode  string  `json:"lucode"`
	Prob    float64 `json:"prob"`
	County  string  `json:"county"`
}

func mergeHexCells(raw []byte) ([]byte, error) {
	var fc cromeFeatureCollection
	if err := json.Unmarshal(raw, &fc); err != nil {
		return nil, err
	}

	if len(fc.Features) == 0 {
		return raw, nil
	}

	type hexCell struct {
		centroid [2]float64
		points   [][2]float64
		lucode   string
		prob     float64
		county   string
		cluster  int
	}

	var cells []hexCell
	for _, f := range fc.Features {
		if f.Properties.Lucode == "" || f.Properties.Lucode == "NA01" {
			continue
		}
		if len(f.Geometry.Coordinates) == 0 {
			continue
		}
		ring := f.Geometry.Coordinates[0]
		cx, cy := 0.0, 0.0
		for _, p := range ring {
			cx += p[0]
			cy += p[1]
		}
		n := float64(len(ring))
		cells = append(cells, hexCell{
			centroid: [2]float64{cx / n, cy / n},
			points:   ring,
			lucode:   f.Properties.Lucode,
			prob:     f.Properties.Prob,
			county:   f.Properties.County,
			cluster:  -1,
		})
	}

	// Spatial clustering: adjacent hexes with same LUCODE within ~150m
	const threshold = 0.0015 // ~110m in degrees — allows adjacent hex cells to cluster
	clusterID := 0
	for i := range cells {
		if cells[i].cluster >= 0 {
			continue
		}
		cells[i].cluster = clusterID
		queue := []int{i}
		for len(queue) > 0 {
			cur := queue[0]
			queue = queue[1:]
			for j := range cells {
				if cells[j].cluster >= 0 || cells[j].lucode != cells[cur].lucode {
					continue
				}
				dx := cells[j].centroid[0] - cells[cur].centroid[0]
				dy := cells[j].centroid[1] - cells[cur].centroid[1]
				if dx*dx+dy*dy < threshold*threshold {
					cells[j].cluster = clusterID
					queue = append(queue, j)
				}
			}
		}
		clusterID++
	}

	// Build merged polygons per cluster
	type clusterData struct {
		lucode string
		points [][2]float64
		count  int
		prob   float64
		county string
	}
	clusters := map[int]*clusterData{}
	for _, c := range cells {
		cd, ok := clusters[c.cluster]
		if !ok {
			cd = &clusterData{lucode: c.lucode, county: c.county}
			clusters[c.cluster] = cd
		}
		cd.count++
		cd.prob += c.prob
		cd.points = append(cd.points, c.points...)
	}

	var outFeatures []cromeFeature
	fieldIdx := 0
	for _, cd := range clusters {
		if cd.count < 4 {
			continue
		}
		hull := convexHull(cd.points)
		if len(hull) < 4 {
			continue
		}
		fieldIdx++
		outFeatures = append(outFeatures, cromeFeature{
			Type: "Feature",
			ID:   fmt.Sprintf("field-%d", fieldIdx),
			Geometry: cromeGeometry{
				Type:        "Polygon",
				Coordinates: [][][2]float64{hull},
			},
			Properties: cromeProperties{
				CromeID: fmt.Sprintf("field-%s-%d", cd.lucode, fieldIdx),
				Lucode:  cd.lucode,
				Prob:    cd.prob / float64(cd.count),
				County:  cd.county,
			},
		})
	}

	out := cromeFeatureCollection{Type: "FeatureCollection", Features: outFeatures}
	return json.Marshal(out)
}

func convexHull(points [][2]float64) [][2]float64 {
	n := len(points)
	if n < 3 {
		return points
	}

	// Sort by x, then y
	sort.Slice(points, func(i, j int) bool {
		if points[i][0] != points[j][0] {
			return points[i][0] < points[j][0]
		}
		return points[i][1] < points[j][1]
	})

	// Remove duplicates
	unique := make([][2]float64, 0, n)
	for i, p := range points {
		if i == 0 || p != points[i-1] {
			unique = append(unique, p)
		}
	}
	points = unique
	n = len(points)
	if n < 3 {
		return points
	}

	// Andrew's monotone chain
	hull := make([][2]float64, 0, 2*n)
	// Lower hull
	for _, p := range points {
		for len(hull) >= 2 && cross(hull[len(hull)-2], hull[len(hull)-1], p) <= 0 {
			hull = hull[:len(hull)-1]
		}
		hull = append(hull, p)
	}
	// Upper hull
	lower := len(hull) + 1
	for i := n - 2; i >= 0; i-- {
		for len(hull) >= lower && cross(hull[len(hull)-2], hull[len(hull)-1], points[i]) <= 0 {
			hull = hull[:len(hull)-1]
		}
		hull = append(hull, points[i])
	}
	return hull
}

func cross(o, a, b [2]float64) float64 {
	return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
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
