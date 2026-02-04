# Shinobu API

## 🔑 Get Shinobu status

> Get the current status of the FileWatcher.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"shinobu","description":"Shinobu Filewatcher APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/shinobu":{"get":{"operationId":"shinobuStatus","summary":"🔑 Get Shinobu status","description":"Get the current status of the FileWatcher.","tags":["shinobu"],"responses":{"200":{"description":"Status","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["shinobu_status"]},"success":{"type":"integer","enum":[0,1]},"is_alive":{"type":"integer","enum":[0,1]},"pid":{"type":"integer","description":"Current PID of the Watcher process"}}}}}}}}}}}
```

## 🔑 Stop Shinobu

> Stops the Filewatcher. Use \`/api/shinobu/restart\` to start it again.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"shinobu","description":"Shinobu Filewatcher APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/shinobu/stop":{"post":{"operationId":"shinobuStop","summary":"🔑 Stop Shinobu","description":"Stops the Filewatcher. Use `/api/shinobu/restart` to start it again.","tags":["shinobu"],"responses":{"200":{"description":"Result","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## 🔑 Restart Shinobu

> Restart the Shinobu filewatcher

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"shinobu","description":"Shinobu Filewatcher APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/shinobu/restart":{"post":{"operationId":"shinobuRestart","summary":"🔑 Restart Shinobu","description":"Restart the Shinobu filewatcher","tags":["shinobu"],"responses":{"200":{"description":"Result","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["shinobu_restart"]},"success":{"type":"integer","enum":[0,1]},"new_pid":{"type":"integer","description":"PID of the new Watcher process."}}}}}}}}}}}
```

## 🔑 Rescan filemap and restart Shinobu

> This deletes the internal map of scanned files on your system (the "filemap") and restarts Shinobu, effectively prompting a full rescan of your FS.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"shinobu","description":"Shinobu Filewatcher APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/shinobu/rescan":{"post":{"operationId":"shinobuRescan","summary":"🔑 Rescan filemap and restart Shinobu","description":"This deletes the internal map of scanned files on your system (the \"filemap\") and restarts Shinobu, effectively prompting a full rescan of your FS.","tags":["shinobu"],"responses":{"200":{"description":"Result","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["shinobu_rescan"]},"success":{"type":"integer","enum":[0,1]},"new_pid":{"type":"integer","description":"PID of the new Watcher process."}}}}}}}}}}}
```
