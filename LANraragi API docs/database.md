# Database API

## Get Statistics

> Get tags from the database, with a value symbolizing their prevalence.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"database","description":"Database management APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"paths":{"/database/stats":{"get":{"operationId":"getStatistics","summary":"Get Statistics","description":"Get tags from the database, with a value symbolizing their prevalence.","tags":["database"],"parameters":[{"name":"minweight","in":"query","required":false,"description":"Add this parameter if you want to only get tags whose weight is at least the given minimum.  \nDefault is 1 if not specified, to get all tags.","schema":{"type":"integer"}}],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"type":"array","items":{"type":"object","properties":{"namespace":{"type":"string","nullable":true,"description":"Namespace of the tag"},"text":{"type":"string","required":true,"description":"The tag itself"},"weight":{"type":"integer","description":"Weight of the tag in the database"}}}}}}}}}}}}
```

## 🔑 Get a backup JSON

> Scans the entire database and returns a backup in JSON form.  \
> This backup can be reimported manually through the Backup and Restore feature.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"database","description":"Database management APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"BackupArchiveMetadataJson":{"type":"object","description":"JSON object for archive metadata in as returned in a backup","required":["arcid","title","tags","summary","filename"],"properties":{"arcid":{"type":"string","minLength":40,"maxLength":40,"description":"Unique identifier for the archive"},"title":{"type":"string","description":"Title of the archive"},"tags":{"type":"string","description":"Comma-separated list of tags associated with the archive"},"summary":{"type":"string","description":"Summary description of the archive"},"thumbhash":{"type":"string","nullable":true,"minLength":40,"maxLength":40,"description":"Thumbnail hash, or null if not set"},"filename":{"type":"string","description":"Filename of the archive"}}},"BackupCategoryMetadataJson":{"type":"object","description":"JSON object for category metadata in as returned in a backup","required":["catid"],"properties":{"archives":{"type":"array","description":"Array of archive IDs","items":{"type":"string","minLength":40,"maxLength":40}},"catid":{"type":"string","description":"ID of the category","minLength":14,"maxLength":14},"name":{"type":"string","description":"Name of the category"},"search":{"type":"string","description":"Category search filter"}}},"TankoubonMetadataJson":{"type":"object","description":"Tankoubon metadata","required":["tankid"],"properties":{"archives":{"type":"array","description":"Array of archive IDs","items":{"type":"string","minLength":40,"maxLength":40}},"tankid":{"type":"string","description":"ID of the tankoubon"},"name":{"type":"string","description":"Name of the tankoubon"}}}}},"paths":{"/database/backup":{"get":{"operationId":"getBackupJson","summary":"🔑 Get a backup JSON","description":"Scans the entire database and returns a backup in JSON form.  \nThis backup can be reimported manually through the Backup and Restore feature.","tags":["database"],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"type":"object","properties":{"archives":{"type":"array","description":"Array of archive metadata","items":{"$ref":"#/components/schemas/BackupArchiveMetadataJson"}},"categories":{"type":"array","description":"Array of category metadata","items":{"$ref":"#/components/schemas/BackupCategoryMetadataJson"}},"tankoubons":{"type":"array","description":"Array of tankoubon metadata","items":{"$ref":"#/components/schemas/TankoubonMetadataJson"}}}}}}}}}}}}
```

## 🔑 Clear All "New" flags

> Clears the "New!" flag on all archives.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"database","description":"Database management APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/database/isnew":{"delete":{"operationId":"clearNewAll","summary":"🔑 Clear All \"New\" flags","description":"Clears the \"New!\" flag on all archives.","tags":["database"],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## 🔑 Clean the Database

> Cleans the Database, hiding then removing entries for files that are no longer on the filesystem.  \
> Entries that are no longer on the filesystem are only unlinked at first so they don't appear in the UI -- A subsequent run of this cleanup will \*\*delete\*\* unlinked entries.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"database","description":"Database management APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/database/clean":{"post":{"operationId":"cleanDatabase","summary":"🔑 Clean the Database","description":"Cleans the Database, hiding then removing entries for files that are no longer on the filesystem.  \nEntries that are no longer on the filesystem are only unlinked at first so they don't appear in the UI -- A subsequent run of this cleanup will **delete** unlinked entries.","tags":["database"],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","description":"Name of the operation"},"success":{"type":"integer","enum":[0,1],"description":"Returns 1 if operation successful, else 0."},"deleted":{"type":"integer","description":"Amount of unlinked DB entries that were deleted"},"unlinked":{"type":"integer","description":"Amount of live DB entries that got unlinked - Run Clean again to delete them."}}}}}}}}}}}
```

## 🔑 Drop the Database

> Delete the entire database, including user preferences.\
> This is a rather dangerous endpoint, invoking it might lock you out of the server as a client!

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"database","description":"Database management APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/database/drop":{"post":{"operationId":"dropDatabase","summary":"🔑 Drop the Database","description":"Delete the entire database, including user preferences.\nThis is a rather dangerous endpoint, invoking it might lock you out of the server as a client!","tags":["database"],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```
