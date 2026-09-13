package main

import (
	_ "embed"
	"net/http"
)

// openAPISpec is the hand-written contract for this API. Change it in the same
// commit as the handler it describes.
//
//go:embed openapi.yaml
var openAPISpec []byte

// docsPage renders openAPISpec with Scalar. The script is a pinned CDN build, so
// the page needs internet access but the API needs no extra dependencies.
const docsPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Capacity API</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.68.0"></script>
    <script>
      Scalar.createApiReference('#app', { url: '/api/openapi.yaml' })
    </script>
  </body>
</html>
`

// handleOpenAPISpec serves GET /api/openapi.yaml
func handleOpenAPISpec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/yaml")
	_, _ = w.Write(openAPISpec)
}

// handleDocs serves GET /api/docs
func handleDocs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(docsPage))
}
