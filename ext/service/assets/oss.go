package assets

import (
	"context"
	"errors"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/aliyun/alibabacloud-oss-go-sdk-v2/oss"
	"github.com/aliyun/alibabacloud-oss-go-sdk-v2/oss/credentials"
)

// OSSStore stores objects in a private bucket using the supplied credentials provider.
type OSSStore struct {
	client *oss.Client
	bucket string
}

func NewOSSStore(region, bucket, endpoint string, provider credentials.CredentialsProvider) (*OSSStore, error) {
	if strings.TrimSpace(region) == "" || strings.TrimSpace(bucket) == "" || provider == nil {
		return nil, errors.New("OSS region, bucket and credentials provider are required")
	}
	if endpoint != "" {
		parsed, err := url.Parse(endpoint)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || (parsed.Path != "" && parsed.Path != "/") {
			return nil, errors.New("OSS endpoint must be an HTTPS origin")
		}
	}
	cfg := oss.LoadDefaultConfig().WithRegion(region).WithCredentialsProvider(provider)
	if endpoint != "" {
		cfg = cfg.WithEndpoint(endpoint)
	}
	return &OSSStore{client: oss.NewClient(cfg), bucket: bucket}, nil
}

func (s *OSSStore) Put(ctx context.Context, key string, body io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, &oss.PutObjectRequest{
		Bucket: oss.Ptr(s.bucket), Key: oss.Ptr(key), Body: body,
		ContentLength: oss.Ptr(size), ContentType: oss.Ptr(contentType),
		ContentDisposition: oss.Ptr("attachment"), ForbidOverwrite: oss.Ptr("true"),
		Acl: oss.ObjectACLPrivate,
	})
	return err
}

func (s *OSSStore) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &oss.DeleteObjectRequest{Bucket: oss.Ptr(s.bucket), Key: oss.Ptr(key)})
	return err
}

func (s *OSSStore) DownloadURL(ctx context.Context, key string, expiry time.Duration, inline bool) (string, error) {
	disposition := "attachment"
	if inline {
		disposition = "inline"
	}
	result, err := s.client.Presign(ctx, &oss.GetObjectRequest{
		Bucket: oss.Ptr(s.bucket), Key: oss.Ptr(key),
		ResponseContentDisposition: oss.Ptr(disposition),
	}, oss.PresignExpires(expiry))
	if err != nil {
		return "", err
	}
	return result.URL, nil
}
