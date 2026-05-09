package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hackathon/farmwise/models"
)

var (
	jobs   = make(map[string]*models.Job)
	jobsMu sync.RWMutex
)

const agentServiceURL = "http://localhost:8001"

func CreateJob(c *gin.Context) {
	var req models.CreateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.DateEnd == "" {
		req.DateEnd = time.Now().Format("2006-01-02")
	}
	if req.DateStart == "" {
		req.DateStart = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}

	job := &models.Job{
		ID:              uuid.New().String(),
		Status:          models.StatusPending,
		Location:        req.Location,
		DateStart:       req.DateStart,
		DateEnd:         req.DateEnd,
		CropImageBase64: req.CropImageBase64,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	jobsMu.Lock()
	jobs[job.ID] = job
	jobsMu.Unlock()

	go dispatchToAgents(job.ID)

	c.JSON(http.StatusCreated, job)
}

func GetJob(c *gin.Context) {
	id := c.Param("id")
	jobsMu.RLock()
	job, ok := jobs[id]
	jobsMu.RUnlock()
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}
	c.JSON(http.StatusOK, job)
}

func SubmitAnnotations(c *gin.Context) {
	id := c.Param("id")
	jobsMu.RLock()
	job, ok := jobs[id]
	jobsMu.RUnlock()
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}
	if job.Status != models.StatusAwaitingAnnotation {
		c.JSON(http.StatusConflict, gin.H{
			"error":  fmt.Sprintf("job not awaiting annotation, current status: %s", job.Status),
			"status": job.Status,
		})
		return
	}

	var req models.AnnotationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	jobsMu.Lock()
	job.Annotations = req.Annotations
	job.Status = models.StatusOptimizing
	job.UpdatedAt = time.Now()
	jobsMu.Unlock()

	go resumeAgentWithAnnotations(id, req.Annotations)

	c.JSON(http.StatusOK, job)
}

func ListJobs(c *gin.Context) {
	jobsMu.RLock()
	defer jobsMu.RUnlock()
	all := make([]*models.Job, 0, len(jobs))
	for _, j := range jobs {
		all = append(all, j)
	}
	c.JSON(http.StatusOK, all)
}

// --- agent communication ---

type agentStartPayload struct {
	JobID           string          `json:"job_id"`
	Location        models.Location `json:"location"`
	DateStart       string          `json:"date_start"`
	DateEnd         string          `json:"date_end"`
	CropImageBase64 string          `json:"crop_image_base64"`
}

type agentResumePayload struct {
	JobID       string               `json:"job_id"`
	Annotations []models.BoundingBox `json:"annotations"`
}

type agentStatusUpdate struct {
	JobID           string                  `json:"job_id"`
	Status          models.JobStatus        `json:"status"`
	SatelliteImages *models.SatelliteImages `json:"satellite_images,omitempty"`
	CropAnalysis    *models.CropAnalysis    `json:"crop_analysis,omitempty"`
	FinalReport     *models.FinalReport     `json:"final_report,omitempty"`
	Error           string                  `json:"error,omitempty"`
}

func dispatchToAgents(jobID string) {
	jobsMu.RLock()
	job := jobs[jobID]
	jobsMu.RUnlock()

	updateStatus(jobID, models.StatusFetchingSatellite)

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
		setError(jobID, fmt.Sprintf("agent service unreachable: %v", err))
		return
	}
	defer resp.Body.Close()

	var update agentStatusUpdate
	if err := json.NewDecoder(resp.Body).Decode(&update); err != nil {
		setError(jobID, fmt.Sprintf("bad agent response: %v", err))
		return
	}
	applyUpdate(jobID, update)
}

func resumeAgentWithAnnotations(jobID string, annotations []models.BoundingBox) {
	payload := agentResumePayload{JobID: jobID, Annotations: annotations}
	body, _ := json.Marshal(payload)

	resp, err := http.Post(agentServiceURL+"/resume", "application/json", bytes.NewReader(body))
	if err != nil {
		setError(jobID, fmt.Sprintf("agent service unreachable: %v", err))
		return
	}
	defer resp.Body.Close()

	var update agentStatusUpdate
	if err := json.NewDecoder(resp.Body).Decode(&update); err != nil {
		setError(jobID, fmt.Sprintf("bad agent response: %v", err))
		return
	}
	applyUpdate(jobID, update)
}

func applyUpdate(jobID string, update agentStatusUpdate) {
	jobsMu.Lock()
	defer jobsMu.Unlock()
	job, ok := jobs[jobID]
	if !ok {
		return
	}
	job.Status = update.Status
	job.UpdatedAt = time.Now()
	if update.SatelliteImages != nil {
		job.SatelliteImages = update.SatelliteImages
	}
	if update.CropAnalysis != nil {
		job.CropAnalysis = update.CropAnalysis
	}
	if update.FinalReport != nil {
		job.FinalReport = update.FinalReport
	}
	if update.Error != "" {
		job.Error = update.Error
	}
}

func updateStatus(jobID string, status models.JobStatus) {
	jobsMu.Lock()
	defer jobsMu.Unlock()
	if job, ok := jobs[jobID]; ok {
		job.Status = status
		job.UpdatedAt = time.Now()
	}
}

func setError(jobID string, msg string) {
	jobsMu.Lock()
	defer jobsMu.Unlock()
	if job, ok := jobs[jobID]; ok {
		job.Status = models.StatusFailed
		job.Error = msg
		job.UpdatedAt = time.Now()
	}
}
