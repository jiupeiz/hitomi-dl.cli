# Miscellaneous other API

## Get server info

> Returns some basic information about the LRR instance this server is running.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"misc","description":"Other APIs that don't fit a dedicated theme."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"paths":{"/info":{"get":{"operationId":"getServerInfo","summary":"Get server info","description":"Returns some basic information about the LRR instance this server is running.","tags":["misc"],"responses":{"200":{"description":"Server info","content":{"application/json":{"schema":{"$ref":"#/components/schemas/ServerInfo"}}}}}}}},"components":{"schemas":{"ServerInfo":{"type":"object","description":"Server info payload emitted by /api/info. Older server versions used integers instead of booleans here.","properties":{"name":{"type":"string","description":"Name of the instance"},"motd":{"type":"string","description":"MOTD of the instance"},"version":{"type":"string","description":"Version of the server"},"version_name":{"type":"string","description":"Version name"},"version_desc":{"type":"string","description":"Version description"},"has_password":{"type":"boolean","description":"Whether the instance is password-protected"},"debug_mode":{"type":"boolean","description":"Whether the instance has debug mode enabled"},"nofun_mode":{"type":"boolean","description":"Whether the instance has no-fun mode enabled"},"archives_per_page":{"type":"integer","description":"How many archives per page the server lists"},"server_resizes_images":{"type":"boolean","description":"Whether the instance auto-downsizes images before serving them"},"server_tracks_progress":{"type":"boolean","description":"Whether the instance tracks reading progression server-side"},"total_pages_read":{"type":"integer","description":"Total amount of pages read"},"total_archives":{"type":"integer","description":"Total amount of archives stored on instance"},"cache_last_cleared":{"type":"integer","description":"Timestamp for last time the search cache was wiped"}}}}}}
```

## Clean the Temporary Folder

> Cleans the server's temporary folder.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"misc","description":"Other APIs that don't fit a dedicated theme."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/tempfolder":{"delete":{"operationId":"cleanTempfolder","summary":"Clean the Temporary Folder","description":"Cleans the server's temporary folder.","tags":["misc"],"responses":{"200":{"description":"Cleanup result","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["cleantemp"]},"success":{"type":"integer","enum":[0,1]},"error":{"type":"string","description":"Error message if something went wrong during cleanup. (The call will still return 200)","nullable":true},"newsize":{"type":"integer","description":"Current size of the temporary folder post-cleanup."}}}}}}}}}}}
```

## Queue a URL download

> Add a URL to be downloaded by the server and added to its library.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"misc","description":"Other APIs that don't fit a dedicated theme."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/download_url":{"post":{"operationId":"downloadUrl","summary":"Queue a URL download","description":"Add a URL to be downloaded by the server and added to its library.","tags":["misc"],"parameters":[{"name":"url","in":"query","description":"URL to download","required":true,"schema":{"type":"string","format":"uri"}},{"name":"catid","in":"query","required":false,"description":"Category ID to add the downloaded URL to.","schema":{"type":"string","minLength":14,"maxLength":14}}],"responses":{"200":{"description":"Enqueued job","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["download_url"]},"url":{"type":"string","description":"URL queued for download"},"category":{"type":"string","nullable":true},"success":{"type":"integer","enum":[0,1]},"job":{"type":"integer"}}}}}},"400":{"description":"Bad request","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## Regenerate Thumbnails

> Queue a Minion job to regenerate missing/all thumbnails on the server.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"misc","description":"Other APIs that don't fit a dedicated theme."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/regen_thumbs":{"post":{"operationId":"regenThumbnails","summary":"Regenerate Thumbnails","description":"Queue a Minion job to regenerate missing/all thumbnails on the server.","tags":["misc"],"parameters":[{"name":"force","in":"query","description":"Whether to generate all thumbnails, or only the missing ones.","required":false,"schema":{"type":"boolean"}}],"responses":{"200":{"description":"Enqueued job","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["regen_thumbnails"]},"success":{"type":"integer","enum":[0,1]},"job":{"type":"integer"}}}}}}}}}}}
```
