package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/hackathon/cropguard/config"
	"github.com/hackathon/cropguard/db"
	"github.com/hackathon/cropguard/models"
)

var agentServiceURL string

func InitJobs(cfg *config.Config) {
	agentServiceURL = cfg.AgentServiceURL
}

func CreateJob(c *fiber.Ctx) error {
	var req models.CreateJobRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.Location.Lat == 0 && req.Location.Lon == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "location is required"})
	}

	if req.DateEnd == "" {
		req.DateEnd = time.Now().Format("2006-01-02")
	}
	if req.DateStart == "" {
		req.DateStart = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}

	userID := c.Locals("user_id").(string)
	jobID := uuid.New().String()
	now := time.Now()

	locationJSON, _ := json.Marshal(req.Location)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Pool.Exec(ctx,
		`INSERT INTO jobs (id, user_id, status, location, date_start, date_end, crop_image_base64, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		jobID, userID, string(models.StatusPending), locationJSON,
		req.DateStart, req.DateEnd, req.CropImageBase64, now, now,
	)
	if err != nil {
		log.Printf("failed to insert job: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create job"})
	}

	job := &models.Job{
		ID:              jobID,
		UserID:          userID,
		Status:          models.StatusPending,
		Location:        req.Location,
		DateStart:       req.DateStart,
		DateEnd:         req.DateEnd,
		CropImageBase64: req.CropImageBase64,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	go dispatchToAgents(jobID, job)

	return c.Status(fiber.StatusCreated).JSON(job)
}

func GetJob(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("user_id").(string)

	job, err := loadJob(id, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "job not found"})
	}
	return c.JSON(job)
}

func ListJobs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx,
		`SELECT id, user_id, status, location, date_start, date_end, crop_image_base64,
		        satellite_images, crop_analysis, detected_fields, selected_field_ids, final_report, error, created_at, updated_at
		 FROM jobs WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list jobs"})
	}
	defer rows.Close()

	jobs := make([]*models.Job, 0)
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			log.Printf("failed to scan job: %v", err)
			continue
		}
		jobs = append(jobs, job)
	}

	return c.JSON(jobs)
}

func SubmitAnnotations(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("user_id").(string)

	job, err := loadJob(id, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "job not found"})
	}

	if job.Status != models.StatusAwaitingAnnotation {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":  fmt.Sprintf("job not awaiting annotation, current status: %s", job.Status),
			"status": job.Status,
		})
	}

	var req models.AnnotationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	selectedJSON, _ := json.Marshal(req.SelectedFieldIDs)
	now := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.Pool.Exec(ctx,
		`UPDATE jobs SET selected_field_ids = $1, status = $2, updated_at = $3 WHERE id = $4`,
		selectedJSON, string(models.StatusOptimizing), now, id,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update job"})
	}

	job.SelectedFieldIDs = req.SelectedFieldIDs
	job.Status = models.StatusOptimizing
	job.UpdatedAt = now

	go resumeAgentWithAnnotations(id, req.SelectedFieldIDs)

	return c.JSON(job)
}

// --- DB helpers ---

type scannable interface {
	Scan(dest ...any) error
}

func scanJob(row scannable) (*models.Job, error) {
	var job models.Job
	var locationJSON, satelliteJSON, analysisJSON, detectedJSON, selectedJSON, reportJSON []byte

	err := row.Scan(
		&job.ID, &job.UserID, &job.Status, &locationJSON,
		&job.DateStart, &job.DateEnd, &job.CropImageBase64,
		&satelliteJSON, &analysisJSON, &detectedJSON, &selectedJSON, &reportJSON,
		&job.Error, &job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if locationJSON != nil {
		json.Unmarshal(locationJSON, &job.Location)
	}
	if satelliteJSON != nil {
		json.Unmarshal(satelliteJSON, &job.SatelliteImages)
	}
	if analysisJSON != nil {
		json.Unmarshal(analysisJSON, &job.CropAnalysis)
	}
	if detectedJSON != nil {
		json.Unmarshal(detectedJSON, &job.DetectedFields)
	}
	if selectedJSON != nil {
		json.Unmarshal(selectedJSON, &job.SelectedFieldIDs)
	}
	if reportJSON != nil {
		json.Unmarshal(reportJSON, &job.FinalReport)
	}

	return &job, nil
}

func loadJob(id, userID string) (*models.Job, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	row := db.Pool.QueryRow(ctx,
		`SELECT id, user_id, status, location, date_start, date_end, crop_image_base64,
		        satellite_images, crop_analysis, detected_fields, selected_field_ids, final_report, error, created_at, updated_at
		 FROM jobs WHERE id = $1 AND user_id = $2`, id, userID)

	return scanJob(row)
}

// --- Agent communication ---

type agentStartPayload struct {
	JobID           string          `json:"job_id"`
	Location        models.Location `json:"location"`
	DateStart       string          `json:"date_start"`
	DateEnd         string          `json:"date_end"`
	CropImageBase64 string          `json:"crop_image_base64"`
}

type agentResumePayload struct {
	JobID            string `json:"job_id"`
	SelectedFieldIDs []int  `json:"selected_field_ids"`
}

type agentStatusUpdate struct {
	JobID           string                  `json:"job_id"`
	Status          models.JobStatus        `json:"status"`
	SatelliteImages *models.SatelliteImages `json:"satellite_images,omitempty"`
	CropAnalysis    *models.CropAnalysis    `json:"crop_analysis,omitempty"`
	DetectedFields  []map[string]any        `json:"detected_fields,omitempty"`
	FinalReport     *models.FinalReport     `json:"final_report,omitempty"`
	Error           string                  `json:"error,omitempty"`
}

func dispatchToAgents(jobID string, job *models.Job) {
	updateJobStatus(jobID, models.StatusFetchingSatellite)

	payload := agentStartPayload{
		JobID:           jobID,
		Location:        job.Location,
		DateStart:       job.DateStart,
		DateEnd:         job.DateEnd,
		CropImageBase64: job.CropImageBase64,
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post(agentServiceURL+"/run", "application/json", bytes.NewReader(body))
	if err != nil {
		setJobError(jobID, fmt.Sprintf("agent service unreachable: %v", err))
		return
	}
	defer resp.Body.Close()

	var update agentStatusUpdate
	if err := json.NewDecoder(resp.Body).Decode(&update); err != nil {
		setJobError(jobID, fmt.Sprintf("bad agent response: %v", err))
		return
	}
	applyUpdate(jobID, update)
}

func resumeAgentWithAnnotations(jobID string, selectedFieldIDs []int) {
	payload := agentResumePayload{JobID: jobID, SelectedFieldIDs: selectedFieldIDs}
	body, _ := json.Marshal(payload)

	resp, err := http.Post(agentServiceURL+"/resume", "application/json", bytes.NewReader(body))
	if err != nil {
		setJobError(jobID, fmt.Sprintf("agent service unreachable: %v", err))
		return
	}
	defer resp.Body.Close()

	var update agentStatusUpdate
	if err := json.NewDecoder(resp.Body).Decode(&update); err != nil {
		setJobError(jobID, fmt.Sprintf("bad agent response: %v", err))
		return
	}
	applyUpdate(jobID, update)
}

func applyUpdate(jobID string, update agentStatusUpdate) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var satelliteJSON, analysisJSON, detectedJSON, reportJSON []byte
	if update.SatelliteImages != nil {
		satelliteJSON, _ = json.Marshal(update.SatelliteImages)
	}
	if update.CropAnalysis != nil {
		analysisJSON, _ = json.Marshal(update.CropAnalysis)
	}
	if update.DetectedFields != nil {
		detectedJSON, _ = json.Marshal(update.DetectedFields)
	}
	if update.FinalReport != nil {
		reportJSON, _ = json.Marshal(update.FinalReport)
	}

	_, err := db.Pool.Exec(ctx,
		`UPDATE jobs SET status = $1,
		 satellite_images = COALESCE($2, satellite_images),
		 crop_analysis = COALESCE($3, crop_analysis),
		 detected_fields = COALESCE($4, detected_fields),
		 final_report = COALESCE($5, final_report),
		 error = COALESCE($6, error),
		 updated_at = $7 WHERE id = $8`,
		string(update.Status), satelliteJSON, analysisJSON, detectedJSON,
		reportJSON, nullableString(update.Error), time.Now(), jobID,
	)
	if err != nil {
		log.Printf("failed to apply update for job %s: %v", jobID, err)
	}
}

func updateJobStatus(jobID string, status models.JobStatus) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Pool.Exec(ctx,
		`UPDATE jobs SET status = $1, updated_at = $2 WHERE id = $3`,
		string(status), time.Now(), jobID,
	)
	if err != nil {
		log.Printf("failed to update status for job %s: %v", jobID, err)
	}
}

func setJobError(jobID string, msg string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Pool.Exec(ctx,
		`UPDATE jobs SET status = $1, error = $2, updated_at = $3 WHERE id = $4`,
		string(models.StatusFailed), msg, time.Now(), jobID,
	)
	if err != nil {
		log.Printf("failed to set error for job %s: %v", jobID, err)
	}
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
