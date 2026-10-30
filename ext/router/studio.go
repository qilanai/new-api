package router

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// Studio owns its document and React root. Only this fixed deployment target
// is proxied; a browser cannot choose an upstream or inject forwarding headers.
func registerStudioDocument(router *gin.Engine) {
	target, err := url.Parse(os.Getenv("EXT_STUDIO_UPSTREAM_URL"))
	configured := err == nil && target.Host != "" && (target.Scheme == "http" || target.Scheme == "https") && target.User == nil && target.RawQuery == "" && target.Fragment == ""
	router.GET("/apps/studio", func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "/apps/studio/")
	})
	router.Match([]string{"GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}, "/apps/studio/*path", func(c *gin.Context) {
		if !configured {
			c.Header("Cache-Control", "no-store")
			c.String(http.StatusServiceUnavailable, "Studio is not configured. Set EXT_STUDIO_UPSTREAM_URL to the Studio web service.")
			return
		}
		proxy := &httputil.ReverseProxy{
			Rewrite: func(r *httputil.ProxyRequest) {
				r.Out.URL.Path = strings.TrimPrefix(r.In.URL.Path, "/apps/studio")
				r.Out.URL.RawPath = ""
				r.SetURL(target)
				r.Out.Host = r.In.Host
				r.SetXForwarded()
			},
			ErrorHandler: func(w http.ResponseWriter, _ *http.Request, _ error) {
				w.Header().Set("Cache-Control", "no-store")
				http.Error(w, "Studio is temporarily unavailable", http.StatusBadGateway)
			},
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	})
}
