package models

import "time"

// --- User ---

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	Provider  string    `json:"provider"`
	CreatedAt time.Time `json:"created_at"`
}

// --- Job ---

type JobStatus string

const (
	StatusPending            JobStatus = "pending"
	StatusFetchingSatellite  JobStatus = "fetching_satellite"
	StatusAnalyzing          JobStatus = "analyzing"
	StatusAwaitingAnnotation JobStatus = "awaiting_annotation"
	StatusOptimizing         JobStatus = "optimizing"
	StatusComplete           JobStatus = "complete"
	StatusFailed             JobStatus = "failed"
)

type Location struct {
	Lat  float64 `json:"lat"`
	Lon  float64 `json:"lon"`
	Name string  `json:"name"`
}

type BoundingBox struct {
	Label string  `json:"label"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	W     float64 `json:"w"`
	H     float64 `json:"h"`
}

type SatelliteImages struct {
	RGBURL   string             `json:"rgb_url"`
	NDVIData map[string]float64 `json:"ndvi_data"`
	Metadata map[string]any     `json:"metadata"`
}

type DetectedIssue struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Confidence float64 `json:"confidence"`
	Severity   string  `json:"severity"`
	Area       string  `json:"area"`
}

type CropAnalysis struct {
	CropType    string          `json:"crop_type"`
	HealthScore float64         `json:"health_score"`
	NDVIMean    float64         `json:"ndvi_mean"`
	Issues      []DetectedIssue `json:"issues"`
	Summary     string          `json:"summary"`
}

type Recommendation struct {
	Priority      string `json:"priority"`
	Action        string `json:"action"`
	Timing        string `json:"timing"`
	EstimatedCost string `json:"estimated_cost"`
}

type AnnotatedIssue struct {
	Issue        DetectedIssue `json:"issue"`
	BoundingBox  BoundingBox   `json:"bounding_box"`
	AreaHectares float64       `json:"area_hectares"`
}

type FinalReport struct {
	HealthScore          float64          `json:"health_score"`
	AnnotatedIssues      []AnnotatedIssue `json:"annotated_issues"`
	Recommendations      []Recommendation `json:"recommendations"`
	ExecutiveSummary     string           `json:"executive_summary"`
	EstimatedYieldImpact string           `json:"estimated_yield_impact"`
}

type Job struct {
	ID               string           `json:"id"`
	UserID           string           `json:"user_id"`
	Status           JobStatus        `json:"status"`
	Location         Location         `json:"location"`
	DateStart        string           `json:"date_start"`
	DateEnd          string           `json:"date_end"`
	CropImageBase64  string           `json:"crop_image_base64,omitempty"`
	SatelliteImages  *SatelliteImages `json:"satellite_images,omitempty"`
	CropAnalysis     *CropAnalysis    `json:"crop_analysis,omitempty"`
	DetectedFields   []map[string]any `json:"detected_fields,omitempty"`
	SelectedFieldIDs []int            `json:"selected_field_ids,omitempty"`
	FinalReport      *FinalReport     `json:"final_report,omitempty"`
	Error            string           `json:"error,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

// --- Request/Response ---

type CreateJobRequest struct {
	Location        Location `json:"location"`
	DateStart       string   `json:"date_start"`
	DateEnd         string   `json:"date_end"`
	CropImageBase64 string   `json:"crop_image_base64"`
}

type AnnotationRequest struct {
	SelectedFieldIDs []int `json:"selected_field_ids"`
}
