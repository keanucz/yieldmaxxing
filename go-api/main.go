package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hackathon/farmwise/handlers"
)

func main() {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		api.POST("/jobs", handlers.CreateJob)
		api.GET("/jobs", handlers.ListJobs)
		api.GET("/jobs/:id", handlers.GetJob)
		api.POST("/jobs/:id/annotations", handlers.SubmitAnnotations)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	log.Println("FarmWise API listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
