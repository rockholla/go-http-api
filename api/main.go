package main

import (
  "fmt"
  "log"
  "net/http"
  "encoding/json"
  "github.com/gorilla/mux"
)

// Trailhead : a single trailhead
type Trailhead struct {
    ID        int
    Name      string
    Latitude  float64
    Longitude float64
}
// Trailheads : many trailheads
type Trailheads []Trailhead

// GetRoot : resource at /
func GetRoot(w http.ResponseWriter, r *http.Request) {
  json.NewEncoder(w).Encode(map[string]string{"message": "Welcome to the trailheads API", "trailheads": "/trailheads"})
}

// GetTrailheads : resource at /trailheads
func GetTrailheads(w http.ResponseWriter, r *http.Request) {
  trailheads := Trailheads{
    Trailhead{ID: 1, Name: "Baxter's Gulch", Latitude: 38.86027669451596, Longitude: -106.9727601880234},
    Trailhead{ID: 2, Name: "Journey's End", Latitude: 38.86619254425446, Longitude: -106.99025183412073},
    Trailhead{ID: 2, Name: "Upended", Latitude: 37.7654537389772, Longitude: -105.9273626660029},
    Trailhead{ID: 2, Name: "Kebler Pass Trailhead", Latitude: 38.86762614165766, Longitude: -107.02326178550722},
  }
  json.NewEncoder(w).Encode(trailheads)
}

// Middleware : common middleware
func Middleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Add("Content-Type", "application/json")
    next.ServeHTTP(w, r)
  })
}

func main() {
  router := mux.NewRouter()
  router.Use(Middleware)
  router.HandleFunc("/", GetRoot).Methods("GET")
  router.HandleFunc("/trailheads", GetTrailheads).Methods("GET")
  fmt.Println("Running server...")
  log.Fatal(http.ListenAndServe(":3000", router))
}
