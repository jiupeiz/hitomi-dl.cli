# Minion API

## Get the basic status of a Minion Job

> For a given Minion job ID, check whether it succeeded or failed.  \
> Minion jobs are ran for various occasions like thumbnails, cache warmup and handling incoming files.  \
> For some jobs, you can check the notes field for progress information. Look at <https://docs.mojolicious.org/Minion/Guide#Job-progress> for more information.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"minion","description":"Minion Job Queue APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"paths":{"/minion/{jobid}":{"get":{"operationId":"minionJobStatus","summary":"Get the basic status of a Minion Job","description":"For a given Minion job ID, check whether it succeeded or failed.  \nMinion jobs are ran for various occasions like thumbnails, cache warmup and handling incoming files.  \nFor some jobs, you can check the notes field for progress information. Look at https://docs.mojolicious.org/Minion/Guide#Job-progress for more information.","tags":["minion"],"parameters":[{"name":"jobid","in":"path","required":true,"description":"ID of the Job to query status for.","schema":{"type":"integer"}}],"responses":{"200":{"description":"Job status data","content":{"application/json":{"schema":{"type":"object","properties":{"task":{"type":"string"},"state":{"type":"string","enum":["inactive","active","finished","failed"]},"notes":{"type":"object","description":"Arbitrary data attached to the Job.","required":false,"nullable":true},"error":{"type":"string","nullable":true}}}}}}}}}}}
```

## 🔑 Get the full status of a Minion Job

> Get the status of a Minion Job.  \
> This API is there for internal usage mostly, but you can use it to get detailed status for jobs like plugin runs or URL downloads.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"minion","description":"Minion Job Queue APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/minion/{jobid}/detail":{"get":{"operationId":"minionJobDetail","summary":"🔑 Get the full status of a Minion Job","description":"Get the status of a Minion Job.  \nThis API is there for internal usage mostly, but you can use it to get detailed status for jobs like plugin runs or URL downloads.","tags":["minion"],"parameters":[{"name":"jobid","in":"path","required":true,"schema":{"type":"integer"}}],"responses":{"200":{"description":"Job detail","content":{"application/json":{"schema":{"type":"object"}}}}}}}}}
```

## 🔑 Queue a Minion job

> Queue a Job with the specified type and parameters.  \
> See LANraragi::Utils::Minion for all the available types of jobs and the parameters they require.  \
> \
> There's no API contract in place for whether a Job type exists on a given server version, so I wouldn't recommend using this unless you have a good reason to. &#x20;

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"minion","description":"Minion Job Queue APIs."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"MinionJobResponse":{"type":"object","description":"JSON object for a queued Minion job.","required":["job","operation","success"],"properties":{"job":{"type":"integer","description":"Minion job ID"},"operation":{"type":"string","description":"Name of operation"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[1,0]}}}}},"paths":{"/minion/{jobname}/queue":{"post":{"operationId":"queueMinionJob","summary":"🔑 Queue a Minion job","description":"Queue a Job with the specified type and parameters.  \nSee LANraragi::Utils::Minion for all the available types of jobs and the parameters they require.  \n\nThere's no API contract in place for whether a Job type exists on a given server version, so I wouldn't recommend using this unless you have a good reason to.  ","tags":["minion"],"parameters":[{"name":"jobname","in":"path","required":true,"description":"Type of the job to instantiate.","schema":{"type":"string","enum":["thumbnail_task","page_thumbnails","regen_all_thumbnails","find_duplicates","build_stat_hashes","handle_upload","download_url","run_plugin"]}},{"name":"args","in":"query","required":true,"description":"Arguments as a JSON array string","schema":{"type":"string"}},{"name":"priority","in":"query","required":false,"default":0,"description":"Priority of the Minion job. The higher the number, the more important the job is.","schema":{"type":"integer"}}],"responses":{"200":{"description":"Enqueued job","content":{"application/json":{"schema":{"$ref":"#/components/schemas/MinionJobResponse"}}}}}}}}}
```
