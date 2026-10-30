# 素材库（实验性）

素材按 new-api 用户隔离。控制台使用登录会话访问 `/api/ext/assets`，程序使用 API Key 访问 `/v1/assets`；同一用户的会话和 API Key 访问同一素材空间。API Key 具有该用户素材的全部读写权限，需按此权限管理密钥。

## 配置

配置 `EXT_ASSETS_OSS_REGION`、`EXT_ASSETS_OSS_BUCKET`，可选 `EXT_ASSETS_OSS_ENDPOINT`（HTTPS），以及 `EXT_ASSETS_OSS_ECS_ROLE`；也可用 环境变量 `EXT_ASSETS_OSS_ACCESS_KEY_ID`、`EXT_ASSETS_OSS_ACCESS_KEY_SECRET`、可选 `EXT_ASSETS_OSS_SESSION_TOKEN`。请使用私有 Bucket 和限于 `assets/users/` 的最小权限，部署端负责保护和轮换凭据。上传需要 `oss:PutObject` 和设置对象私有 ACL 所需的 `oss:PutObjectAcl`，下载签名需要 `oss:GetObject`，清理需要 `oss:DeleteObject`。Bucket 不应允许公共访问。OSS 环境配置更新后重启实例。拥有超级管理员权限的用户可在素材库的“素材库设置”页面调整上传开关、单文件上限、每用户容量和允许的 MIME 类型；这些非敏感设置保存在数据库并在各节点即时读取。OSS Bucket、地域、Endpoint 和凭证来源在页面仅供查看，不在页面写入或显示密钥。首次保存前以环境变量为默认值，保存后以数据库设置为准。

`EXT_ASSETS_MAX_FILE_BYTES` 默认 104857600，最大 5 GiB；`EXT_ASSETS_USER_QUOTA_BYTES` 默认 1073741824，最大 1 TiB。上传先流式写入服务节点临时目录再传至 OSS，请确保临时目录有足够空间。每节点最多同时接收 8 个上传。上传完成后清理本地临时文件。

## API

响应均为 `{"success":true,"message":"","data":...}`；失败时 HTTP 状态码非 2xx。素材 ID 是随机 ID，所有请求均按认证用户过滤。

- `POST /v1/assets`：multipart 文件字段 `file`；文件字段须为第一个字段。
- `GET /v1/assets?page=1&page_size=20&search=...`：名称搜索和分页，返回 `items`、`total`、`used_bytes`、`quota_bytes`。列表项对支持内联预览的媒体类型（PNG、JPEG、GIF、WebP、MP4、WebM、Ogg、QuickTime 视频及常见音频）直接附带 5 分钟有效的 `preview_url`。
- `GET /v1/assets/{id}`：素材详情。
- `PATCH /v1/assets/{id}`：JSON `{"name":"new name"}`。
- `DELETE /v1/assets/{id}`：删除素材。
- `POST /v1/assets/{id}/download-url`：获取默认 5 分钟有效的下载地址。加 `?preview=true` 可对支持内联预览的图片、视频、音频生成 `inline` 预览地址，其他类型仍作为附件下载。

```sh
curl -H "Authorization: Bearer $NEW_API_KEY" -F "file=@image.png" https://example.com/v1/assets
curl -H "Authorization: Bearer $NEW_API_KEY" https://example.com/v1/assets
```

签名 URL 在有效期内可被转交；权限撤销不会立即撤销已签发的 URL。OSS 版本控制、保留策略以及历史版本清理需由部署方单独管理。

可在管理员页面或通过环境变量 `EXT_ASSETS_ALLOWED_CONTENT_TYPES` 设置允许的 MIME 类型，以英文逗号分隔，留空不限制。服务端使用文件头检测 MIME，而不是信任客户端声明；某些文件格式可能被识别为 `application/octet-stream`，配置时应先验证业务文件。

签名 URL 使用所配置的 OSS Endpoint；使用内网 Endpoint 时，浏览器或 API 客户端也必须能访问该地址。名称搜索支持 `search`，类型筛选使用 `type=image|audio|video|other`，时间筛选使用 Unix 秒数 `created_after` 和 `created_before`。

控制台日期筛选使用浏览器所在时区，起始日从 00:00:00 开始，结束日包含至 23:59:59。关闭上传不会删除既有素材，也不会阻止下载或删除。
