FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o yieldmaxxing-api .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/yieldmaxxing-api .
COPY --from=builder /app/db/migrations ./db/migrations
EXPOSE 9847
CMD ["./yieldmaxxing-api"]
