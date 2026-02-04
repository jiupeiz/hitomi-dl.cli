# Downloader API 文档

该 API 提供了一个基于 Flask 的接口，用于通过 `gallery-dl` 下载画廊并将其打包为 ZIP 文件。

## 基本信息

- **基础 URL**: `http://<host>:5000`
- **内容类型**: `application/json`

---

## 接口列表

### 1. 提交下载任务

创建一个新的异步下载任务。

- **URL**: `/api/download`
- **方法**: `POST`
- **请求体**:

| 参数 | 类型 | 必选 | 说明 |
| :--- | :--- | :--- | :--- |
| `url` | String | 是 | 要下载的画廊 URL |

- **成功响应 (200 OK)**:

```json
{
  "job_id": "uuid-string",
  "status": "QUEUED",
  "url": "https://example.com/gallery"
}
```

- **错误响应 (400 Bad Request)**:

```json
{
  "error": "URL is required"
}
```

---

### 2. 获取所有任务列表

列出当前内存中存储的所有任务摘要。

- **URL**: `/api/jobs`
- **方法**: `GET`
- **成功响应 (200 OK)**:

```json
[
  {
    "id": "uuid-string",
    "status": "DOWNLOADING",
    "url": "https://example.com/gallery",
    "title": "Gallery Title | 示例标题",
    "total_files": 105,
    "downloaded_files": 15,
    "error": null
  },
  {
    "id": "uuid-string-2",
    "status": "COMPLETED",
    "url": "https://example.com/gallery2",
    "title": "Another Gallery",
    "total_files": 20,
    "downloaded_files": 20,
    "error": null
  }
]
```

---

### 3. 获取特定任务详情

根据任务 ID 获取完整的任务状态信息，包括日志和结果路径。

- **URL**: `/api/jobs/<job_id>`
- **方法**: `GET`
- **成功响应 (200 OK)**:

```json
{
  "id": "uuid-string",
  "url": "https://example.com/gallery",
  "status": "DOWNLOADING",
  "title": "Gallery Title | 示例标题",
  "total_files": 105,
  "downloaded_files": 42,
  "log": "gallery-dl output logs...\nfile1.jpg\nfile2.jpg...",
  "error": null,
  "result_path": null
}
```

或任务完成时：

```json
{
  "id": "uuid-string",
  "url": "https://example.com/gallery",
  "status": "COMPLETED",
  "title": "Gallery Title | 示例标题",
  "total_files": 105,
  "downloaded_files": 105,
  "log": "...",
  "error": null,
  "result_path": "/out/123456 Gallery Title.zip"
}
```

- **参数说明**:
    - `title`: 画廊标题（元数据预取成功后显示）。
    - `total_files`: 预计总文件数/页数。
    - `downloaded_files`: 当前已下载的文件数（根据日志实时更新）。

- **错误响应 (404 Not Found)**:

```json
{
  "error": "Job not found"
}
```

---

### 4. 清理任务记录

从内存中删除已完成或失败的任务记录。正在进行中（QUEUED 或 DOWNLOADING）的任务**不会**被删除。

- **URL**: `/api/jobs/clear`
- **方法**: `POST`
- **查询参数 (Query Parameters)**:

| 参数 | 类型 | 必选 | 说明 |
| :--- | :--- | :--- | :--- |
| `status` | String | 否 | 指定要清理的状态（如 `COMPLETED`, `FAILED`）。如果不传，将清理所有非活跃任务（完成或失败）。 |

- **示例请求**:
    - 清理所有非活跃任务: `POST /api/jobs/clear`
    - 只清理失败任务: `POST /api/jobs/clear?status=FAILED`

- **成功响应 (200 OK)**:

```json
{
  "message": "Cleared 5 jobs",
  "cleared_count": 5
}
```

---

## 任务状态说明

任务在生命周期中可能处于以下状态：

- `QUEUED`: 任务已创建，等待执行。
- `DOWNLOADING`: `gallery-dl` 正在运行，正在下载文件。
- `COMPLETED`: 下载并压缩成功，ZIP 和 JSON 文件已移至输出目录。
- `FAILED`: 任务执行过程中出错。

---

## 注意事项

- **数据持久性**: 任务列表存储在内存中 (`JOBS` 变量)，重启容器或应用后任务历史将丢失。
- **并发限制**: 最大并发任务数由环境变量 `MAX_WORKERS` 控制（默认为 3）。
- **文件清理**: 任务执行完成后，临时目录会被自动删除。
- **输出文件**: 完成后会在 `/out` 目录生成 `<id> <title>.zip` 和 `<id> <title>.json`。
