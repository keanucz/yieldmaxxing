package sentinel

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
)

const (
	tokenURL   = "https://services.sentinel-hub.com/oauth/token"
	processURL = "https://services.sentinel-hub.com/api/v1/process"
)

type Client struct {
	http *http.Client
}

func NewClient(clientID, clientSecret string) *Client {
	cfg := &clientcredentials.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		TokenURL:     tokenURL,
		EndpointParams: url.Values{
			"grant_type": {"client_credentials"},
		},
	}
	return &Client{
		http: cfg.Client(context.Background()),
	}
}

type BBox struct {
	West  float64
	South float64
	East  float64
	North float64
}

func BBoxFromPoint(lat, lon, radiusKm float64) BBox {
	latDeg := radiusKm / 111.32
	lonDeg := radiusKm / (111.32 * math.Cos(lat*math.Pi/180))
	return BBox{
		West:  lon - lonDeg,
		South: lat - latDeg,
		East:  lon + lonDeg,
		North: lat + latDeg,
	}
}

func (b BBox) String() string {
	return fmt.Sprintf("[%.6f,%.6f,%.6f,%.6f]", b.West, b.South, b.East, b.North)
}

func (b BBox) Width() float64  { return b.East - b.West }
func (b BBox) Height() float64 { return b.North - b.South }

func (c *Client) FetchNDVI(ctx context.Context, bbox BBox, dateFrom, dateTo string, width, height int) ([]byte, error) {
	body := buildProcessRequest(bbox, dateFrom, dateTo, width, height, ndviEvalscript)
	return c.doProcess(ctx, body)
}

func (c *Client) FetchRGB(ctx context.Context, bbox BBox, dateFrom, dateTo string, width, height int) ([]byte, error) {
	body := buildProcessRequest(bbox, dateFrom, dateTo, width, height, rgbEvalscript)
	return c.doProcess(ctx, body)
}

func (c *Client) doProcess(ctx context.Context, body []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, processURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("sentinel: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sentinel: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sentinel: %d: %s", resp.StatusCode, string(errBody))
	}

	return io.ReadAll(resp.Body)
}

// TokenSource exposes underlying oauth2.TokenSource for health checks.
func (c *Client) TokenSource() oauth2.TokenSource {
	transport := c.http.Transport.(*oauth2.Transport)
	return transport.Source
}
