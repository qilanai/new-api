package router

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// Workspace owns its React root and routes under /apps/workspace.
// Only this fixed deployment target is proxied; a browser cannot choose an
// upstream or inject forwarding headers.
func registerWorkspaceDocument(router *gin.Engine) {
	upstream := os.Getenv("EXT_WORKSPACE_UPSTREAM_URL")
	if upstream == "" {
		upstream = os.Getenv("EXT_CHAT_UPSTREAM_URL")
	}
	target, err := url.Parse(upstream)
	configured := err == nil && target.Host != "" && (target.Scheme == "http" || target.Scheme == "https") && target.User == nil && target.RawQuery == "" && target.Fragment == ""
	handler := func(c *gin.Context) {
		if !configured {
			c.Header("Cache-Control", "no-store")
			c.String(http.StatusServiceUnavailable, "Workspace is not configured. Set EXT_WORKSPACE_UPSTREAM_URL to the workspace web service.")
			return
		}
		proxy := &httputil.ReverseProxy{
			Rewrite: func(r *httputil.ProxyRequest) {
				r.Out.URL.RawPath = ""
				r.SetURL(target)
				r.Out.Host = r.In.Host
				r.SetXForwarded()
			},
			ErrorHandler: func(w http.ResponseWriter, _ *http.Request, _ error) {
				w.Header().Set("Cache-Control", "no-store")
				http.Error(w, "Workspace is temporarily unavailable", http.StatusBadGateway)
			},
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}
	methods := []string{"GET", "HEAD", "OPTIONS"}
	router.Match(methods, "/apps/workspace", func(c *gin.Context) { c.Redirect(http.StatusTemporaryRedirect, "/apps/workspace/") })
	router.Match(methods, "/apps/workspace/*path", handler)
	legacy := func(c *gin.Context) {
		path := strings.TrimPrefix(c.Request.URL.Path, "/apps/lobehub")
		if path == "" || path == "/" {
			path = "/chat"
		}
		destination := "/apps/workspace" + path
		if c.Request.URL.RawQuery != "" {
			destination += "?" + c.Request.URL.RawQuery
		}
		c.Redirect(http.StatusTemporaryRedirect, destination)
	}
	router.Match(methods, "/apps/lobehub", legacy)
	router.Match(methods, "/apps/lobehub/*path", legacy)
}
