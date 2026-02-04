# Category API

## Get all Categories

> Get all the categories saved on the server.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"paths":{"/categories":{"get":{"operationId":"getCategoryList","summary":"Get all Categories","description":"Get all the categories saved on the server.","tags":["categories"],"responses":{"200":{"description":"Categories","content":{"application/json":{"schema":{"type":"array","items":{"$ref":"#/components/schemas/CategoryMetadataJson"}}}}}}}}},"components":{"schemas":{"CategoryMetadataJson":{"type":"object","description":"Category metadata.","required":["id"],"properties":{"archives":{"type":"array","description":"Array of archive IDs (if this is a static category, empty otherwise)","items":{"type":"string","minLength":40,"maxLength":40}},"id":{"type":"string","description":"ID of the category","minLength":14,"maxLength":14},"name":{"type":"string","description":"Name of the category"},"pinned":{"type":"int","description":"Whether this category should be pinned in the UI","enum":[0,1]},"search":{"type":"string","description":"Category search filter (if this is a dynamic category, empty otherwise)","nullable":true}}}}}}
```

## 🔑 Create a Category

> Create a new Category.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/categories":{"put":{"operationId":"createCategory","summary":"🔑 Create a Category","description":"Create a new Category.","tags":["categories"],"requestBody":{"required":true,"content":{"application/x-www-form-urlencoded":{"schema":{"type":"object","required":["name"],"properties":{"name":{"type":"string","description":"Name of the Category."},"search":{"type":"string","description":"Matching predicate, if creating a Dynamic Category."},"pinned":{"type":"boolean","description":"Add this parameter if you want the created category to be pinned."}}}},"multipart/form-data":{"schema":{"type":"object","required":["name"],"properties":{"name":{"type":"string","description":"Name of the Category."},"search":{"type":"string","description":"Matching predicate, if creating a Dynamic Category."},"pinned":{"type":"boolean","description":"Add this parameter if you want the created category to be pinned."}}}}}},"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["create_category"]},"category_id":{"type":"string","description":"ID of the created Category","minLength":14,"maxLength":14},"success":{"type":"integer","enum":[0,1]}}}}}},"400":{"description":"Error response","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## Get bookmark-linked Category

> Retrieves the ID of the category currently linked to the bookmark feature.  \
> Returns an empty string if no category is linked.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"paths":{"/categories/bookmark_link":{"get":{"operationId":"getBookmarkLink","summary":"Get bookmark-linked Category","description":"Retrieves the ID of the category currently linked to the bookmark feature.  \nReturns an empty string if no category is linked.","tags":["categories"],"responses":{"200":{"description":"Link","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["get_bookmark_link"]},"success":{"type":"integer","enum":[0,1]},"category_id":{"anyOf":[{"type":"string","minLength":14,"maxLength":14},{"type":"string","enum":[""]}]}}}}}}}}}}}
```

## 🔑 Disable bookmark feature

> Disables the bookmark feature by removing the link to any category.  \
> Returns the ID of the previously linked category.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}}},"paths":{"/categories/bookmark_link":{"delete":{"operationId":"removeBookmarkLink","summary":"🔑 Disable bookmark feature","description":"Disables the bookmark feature by removing the link to any category.  \nReturns the ID of the previously linked category.","tags":["categories"],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string"},"category_id":{"description":"ID of the previously linked category.","anyOf":[{"type":"string","minLength":14,"maxLength":14},{"type":"string","enum":[""]}]},"success":{"type":"integer","enum":[0,1]}}}}}}}}}}}
```

## 🔑 Update bookmark-linked Category

> Links the bookmark feature to the specified static category.  \
> This determines which category archives are added to when using the bookmark button.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/categories/bookmark_link/{id}":{"put":{"operationId":"updateBookmarkLink","summary":"🔑 Update bookmark-linked Category","description":"Links the bookmark feature to the specified static category.  \nThis determines which category archives are added to when using the bookmark button.","tags":["categories"],"parameters":[{"name":"id","in":"path","required":true,"schema":{"type":"string","minLength":14,"maxLength":14}}],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string"},"category_id":{"type":"string","description":"ID of the category that was linked","minLength":14,"maxLength":14},"success":{"type":"integer","enum":[0,1]}}}}}},"400":{"description":"Error response","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}},"404":{"description":"Category with specified ID does not exist","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## Get a single Category

> Get the details of the specified category ID.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"paths":{"/categories/{id}":{"get":{"operationId":"getCategory","summary":"Get a single Category","description":"Get the details of the specified category ID.","tags":["categories"],"parameters":[{"name":"id","in":"path","required":true,"schema":{"type":"string","minLength":14,"maxLength":14}}],"responses":{"200":{"description":"Category","content":{"application/json":{"schema":{"$ref":"#/components/schemas/CategoryMetadataJson"}}}}}}}},"components":{"schemas":{"CategoryMetadataJson":{"type":"object","description":"Category metadata.","required":["id"],"properties":{"archives":{"type":"array","description":"Array of archive IDs (if this is a static category, empty otherwise)","items":{"type":"string","minLength":40,"maxLength":40}},"id":{"type":"string","description":"ID of the category","minLength":14,"maxLength":14},"name":{"type":"string","description":"Name of the category"},"pinned":{"type":"int","description":"Whether this category should be pinned in the UI","enum":[0,1]},"search":{"type":"string","description":"Category search filter (if this is a dynamic category, empty otherwise)","nullable":true}}}}}}
```

## 🔑 Update Category

> Modify a Category.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/categories/{id}":{"put":{"operationId":"updateCategory","summary":"🔑 Update Category","description":"Modify a Category.","tags":["categories"],"requestBody":{"required":false,"content":{"application/x-www-form-urlencoded":{"schema":{"type":"object","properties":{"name":{"type":"string","description":"New name of the Category"},"search":{"type":"string","description":"Predicate. Trying to add a predicate to a category that already contains Archives will give you an error."},"pinned":{"type":"boolean","description":"Add this argument to pin the Category. If you don't, the category will be unpinned on update."}}}},"multipart/form-data":{"schema":{"type":"object","properties":{"name":{"type":"string"},"search":{"type":"string"},"pinned":{"type":"boolean"}}}}}},"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"type":"object","properties":{"operation":{"type":"string","enum":["update_category"]},"category_id":{"type":"string","minLength":14,"maxLength":14},"success":{"type":"integer","enum":[0,1]}}}}}},"400":{"description":"Error response","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}},"423":{"description":"The Category is currently locked for modification","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## DELETE /categories/{id}

> 🔑 Delete Category

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/categories/{id}":{"delete":{"operationId":"deleteCategory","summary":"🔑 Delete Category","tags":["categories"],"responses":{"200":{"description":"Success response","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}},"423":{"description":"The category ID is currently locked for modification","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## 🔑 Add an Archive to a Category

> Adds the specified Archive ID (see Archive API) to the given Category.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/categories/{id}/{archive}":{"put":{"operationId":"addToCategory","summary":"🔑 Add an Archive to a Category","description":"Adds the specified Archive ID (see Archive API) to the given Category.","tags":["categories"],"parameters":[{"name":"id","in":"path","description":"Archive ID to add.","required":true,"schema":{"type":"string","minLength":14,"maxLength":14}},{"name":"archive","in":"path","required":true,"schema":{"type":"string","minLength":40,"maxLength":40}}],"responses":{"200":{"description":"Result","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}},"423":{"description":"The category ID is currently locked for modification","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```

## 🔑 Remove an Archive from a Category

> Remove an Archive ID from a Category.

```json
{"openapi":"3.1.0","info":{"title":"LANraragi API","version":"0.9.6"},"tags":[{"name":"categories","description":"Endpoints related to Categories."}],"servers":[{"url":"https://lrr.tvc-16.science/api"}],"security":[{"api_key":[]}],"components":{"securitySchemes":{"api_key":{"type":"apiKey","name":"Authorization","in":"header","description":"Use Authorization: Bearer <base64(api_key)>"}},"schemas":{"OperationResponse":{"type":"object","required":["operation","success"],"properties":{"operation":{"type":"string","description":"Name of operation"},"error":{"type":"string","description":"Error message if any"},"successMessage":{"type":"string","description":"Success message if any"},"success":{"type":"integer","description":"Returns 1 if operation was successful, else 0","enum":[0,1]}}}}},"paths":{"/categories/{id}/{archive}":{"delete":{"operationId":"removeFromCategory","summary":"🔑 Remove an Archive from a Category","description":"Remove an Archive ID from a Category.","tags":["categories"],"parameters":[{"name":"id","in":"path","description":"Archive ID to remove.","required":true,"schema":{"type":"string","minLength":14,"maxLength":14}},{"name":"archive","in":"path","required":true,"schema":{"type":"string","minLength":40,"maxLength":40}}],"responses":{"200":{"description":"Result","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}},"423":{"description":"The category ID is currently locked for modification","content":{"application/json":{"schema":{"$ref":"#/components/schemas/OperationResponse"}}}}}}}}}
```
