package sentinel

import (
	"encoding/json"
	"fmt"
)

type processRequest struct {
	Input      processInput  `json:"input"`
	Output     processOutput `json:"output"`
	Evalscript string        `json:"evalscript"`
}

type processInput struct {
	Bounds processBounds       `json:"bounds"`
	Data   []processDataSource `json:"data"`
}

type processBounds struct {
	Properties map[string]string `json:"properties"`
	BBox       [4]float64        `json:"bbox"`
}

type processDataSource struct {
	Type       string           `json:"type"`
	DataFilter processFilter    `json:"dataFilter"`
	Processing map[string]string `json:"processing,omitempty"`
}

type processFilter struct {
	TimeRange        timeRange `json:"timeRange"`
	MaxCloudCoverage int       `json:"maxCloudCoverage"`
}

type timeRange struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type processOutput struct {
	Width     int              `json:"width"`
	Height    int              `json:"height"`
	Responses []outputResponse `json:"responses"`
}

type outputResponse struct {
	Identifier string       `json:"identifier"`
	Format     outputFormat `json:"format"`
}

type outputFormat struct {
	Type string `json:"type"`
}

func buildProcessRequest(bbox BBox, dateFrom, dateTo string, width, height int, evalscript string) []byte {
	req := processRequest{
		Input: processInput{
			Bounds: processBounds{
				Properties: map[string]string{"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
				BBox:       [4]float64{bbox.West, bbox.South, bbox.East, bbox.North},
			},
			Data: []processDataSource{{
				Type: "sentinel-2-l2a",
				DataFilter: processFilter{
					TimeRange: timeRange{
						From: fmt.Sprintf("%sT00:00:00Z", dateFrom),
						To:   fmt.Sprintf("%sT23:59:59Z", dateTo),
					},
					MaxCloudCoverage: 30,
				},
				Processing: map[string]string{"upsampling": "BILINEAR"},
			}},
		},
		Output: processOutput{
			Width:  width,
			Height: height,
			Responses: []outputResponse{{
				Identifier: "default",
				Format:     outputFormat{Type: "image/png"},
			}},
		},
		Evalscript: evalscript,
	}

	data, _ := json.Marshal(req)
	return data
}
