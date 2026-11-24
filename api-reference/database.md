# Database

Every method raises [`SkapiError`](/introduction/errors) with a `code` and a `message`. Records are returned as dicts; the shape is in [The record](/database/fetch#the-record).

## Common errors

These can come from any method below that takes the input or needs the state.

| code | message | when |
|---|---|---|
| `INVALID_REQUEST` | `User login is required.` | the method needs a signed-in user |
| `INVALID_PARAMETER` | `"<field>" should be type: <string>.` / `"<field>" is required.` | a name is missing or not a str |
| `INVALID_PARAMETER` | `"<field>" should be <= 256 characters.` | a table, index or tag name (or string value) is too long; `/ ! * # %` count as 3 each |
| `INVALID_PARAMETER` | `"<field>" cannot include control characters or unsupported sentinel characters.` | |
| `INVALID_PARAMETER` | `"<field>" cannot start with "$".` | a custom index name |
| `INVALID_PARAMETER` | `"<value>" is invalid in "condition". allowed types or values are: ...` | an unknown condition |
| `INVALID_PARAMETER` | `Number value should be within range -4503599627370496 ~ +4503599627370496` | an index number out of range |
| `INVALID_PARAMETER` | `"table.access_group" is invalid.` / `"table.access_group" should be type: <number \| string>.` / `"table.access_group" value should be within a range of 0 ~ 99.` | |
| `INVALID_PARAMETER` | `Unsigned users have no access to records with access group.` | signed out, with an access group other than `"public"` |
| `INVALID_PARAMETER` | `User ID is empty.` / `User ID should be type: string.` / `User ID is invalid.` | a user ID (the field name varies) |
| `INVALID_REQUEST` | `Fetch limit should be a number.` / `Fetch limit should be below 1000.` | `fetch_options["limit"]` |
| `INVALID_PARAMETER` | `"ascending" should be a boolean.` | `fetch_options["ascending"]` |
| `INVALID_PARAMETER` | `"<value>" is invalid startKey key.` | `startKey` is not a dict, `"start"` or `"end"` |
| `NETWORK_ERROR` | `Network error: <reason>` | no answer came back |
| `TIMEOUT` | `No response for <timeout> seconds.` | nothing was sent or received for `timeout` seconds |
| `TOO_MANY_REQUESTS` | `Too many requests: ...` | still refused after 6 automatic retries |
| `TIMEOUT` | `Upload timeout: ...` | a file upload stalled: nothing sent for `timeout` seconds, or no answer 5 × `timeout` seconds after it was sent (listed in `errors` of `upload_files()`) |

`fetch_options` is `{"limit", "fetchMore", "ascending", "startKey"}`, see [Paging](/database/fetch#paging). Methods that take it return `{"list": [...], "startKey": ..., "endOfList": bool, "startKeyHistory": [...]}`.

## post_record

```python
skapi.post_record(data=<left out>, config: dict = None, files: list | None = None) -> dict
```

Creates a record, or updates the one named by `config["record_id"]`. Returns the saved record. See [Creating Records](/database/create) and [Updating](/database/update-delete). The uploader of a record with `can_modify_referencing_records` on can also update the `data`, `tags` and `index` of records that reference it, or unlink them with `"reference": None`: see [Editing records that reference yours](/database/reference#editing-records-that-reference-yours).

| argument | |
|---|---|
| `data` | Any JSON value, up to 2 MB. Left out (pass `config=` by name): keep the stored data. `None`: store null. `config["data"]`, when present, is used instead. |
| `config` | Required. Keys below. |
| `files` | `[{"name", "file", "filename"?, "content_type"?}]`; `file` is a path, `bytes` or a file object. See [Files](/database/files). |

| config key | type | |
|---|---|---|
| `table` | dict | `{"name", "access_group"}`. Required unless `record_id` is given. On create a left-out group is `"public"`; on update it keeps the record's group. |
| `record_id` | str | The record (or unique ID) to update. |
| `unique_id` | str or `None` | `None` removes it. |
| `readonly` | bool | |
| `index` | dict or `None` | `{"name": str, "value": str, number or bool}`. `None` removes it. |
| `tags` | list of str, or comma-separated str | `None` or `[]` removes them. |
| `reference` | str, `{"record_id"}`, `{"unique_id"}` or `None` | `None` removes it. |
| `source` | dict | `referencing_limit` (number or `None`), `prevent_multiple_referencing`, `can_remove_referencing_records`, `can_modify_referencing_records`, `only_granted_can_reference`, `allow_granted_to_grant_others` (bools), `referencing_index_restrictions` (list of `{"name", "value"?, "condition"?}`). See [Reference rules](/database/reference#reference-rules). `can_modify_referencing_records` can be turned on only when the record is created, and turned off at any time. |
| `remove_bin` | list of urls or bin dicts, or `None` | Files to remove. `None` removes every file; `[]` removes nothing. |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"config" argument is required.` |
| `INVALID_PARAMETER` | `"table.name" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "table". allowed types or values are: Type<string>, Type<object>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "unique_id". allowed types or values are: Type<string>, null.` |
| `INVALID_PARAMETER` | `<value> is invalid in "readonly". allowed type or value is: Type<boolean>.` |
| `INVALID_PARAMETER` | `"index" should be type: <object \| null>.` |
| `INVALID_PARAMETER` | `"tag" should be type: <string \| string[]>.` |
| `INVALID_PARAMETER` | `"reference" should be type: <string \| object>.` / `"reference.unique_id" should be type: <string>.` |
| `INVALID_PARAMETER` | `"remove_bin" should be type: <string[] \| BinaryFile[] \| null>` |
| `INVALID_PARAMETER` | `"reference_limit" should be type: <number \| null>` / `"reference_limit" should be >= 0` |
| `INVALID_PARAMETER` | `"source.<key>" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `Key "name" is required.` (an index restriction without `name`) |
| `INVALID_PARAMETER` | `Index restriction "range" type should match the type of "value".` (any restriction with `range`) |
| `INVALID_PARAMETER` | `"files[<i>]" should be {"name": <field name>, "file": <path, bytes or file object>}.` |
| `INVALID_PARAMETER` | `"files[<i>].file" should be a path, bytes or a file object.` / `"files[<i>].filename" is required for bytes.` |
| `INVALID_REQUEST` | `Data should not exceed 2MB` / `Invalid data type.` |
| `INVALID_REQUEST` | `Public users can only post records to public tables.` / `Public users cannot update existing records.` / `Public users cannot set unique_id for records.` / `Public users cannot remove files from records.` |
| `INVALID_REQUEST` | `User has no access to update this record.` |
| `INVALID_REQUEST` | `Record is read only.` |
| `INVALID_REQUEST` | `"source.can_modify_referencing_records" can only be set when the record is created. Only the project owner and admins in access group 99 can turn it on for an existing record.` |
| `INVALID_REQUEST` | `The referenced record's user can only change the data, tags and index of a record that references theirs, or unlink it (<key> differs).` / `The referenced record's user cannot update a private record.` |
| `INVALID_REQUEST` | `Only the owner of a record can move it into or out of the private access group.` / `User has no access to change the private access of the record.` |
| `INVALID_REQUEST` | `"__data__/__json__.json" is a reserved file name.` (a file named `__json__.json` under the name `__data__`) |

A file path that cannot be opened raises `INVALID_PARAMETER` (`"files[<i>].file" cannot be read: <reason>.`). A file that storage refuses after the record is saved raises nothing.

## post_records

```python
skapi.post_records(items: list[dict]) -> dict
```

Saves many records, 100 to a request. Each item is `{"data"?: ..., "config": {...}}` with the keys of [post_record](#post-record); files are not supported. Returns:

```python
{"list": [record, ...], "failed": [{"index": int, "code": str, "message": str}, ...]}
```

A refused item is listed in `failed` with the error `post_record` would have raised, and does not stop the others. A failed request (network, sign-in, server) raises, and records saved before it stay saved. See [Many records at once](/database/create#many-records-at-once).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"items" should be a non-empty array.` |
| in `failed` | `"items[<i>]" should be an object with "config".` / `"items[<i>].config" is required.` |
| in `failed`, `ERROR` | `The server answered nothing for this record.` / `The record was not saved.` |

## get_records

```python
skapi.get_records(query: dict | None = None, fetch_options: dict | None = None) -> dict
```

Returns `{"list": [record, ...], "startKey", "endOfList", "startKeyHistory"}`. See [Fetching Records](/database/fetch).

| query key | type | |
|---|---|---|
| `record_id` | str | One record. Every other key is ignored. |
| `unique_id` | str | One record by unique ID. Ignored when `record_id` is given. |
| `table` | dict | `{"name", "access_group"}`, both required. Needed except with `record_id`, `unique_id` or (signed in) `reference`. |
| `reference` | str, or `{"record_id"}`, `{"unique_id"}`, `{"user_id"}` | Records that reference this record, or records this user uploaded. |
| `index` | dict | `{"name", "value", "condition"?, "range"?}`. `name` may be `"$uploaded"`, `"$updated"`, `"$referenced_count"` (number values) or `"$user_id"` (a user ID). `condition`: `"="`, `">"`, `">="`, `"<"`, `"<="`, `"eq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`. With both `condition` and `range`, `range` is dropped. See [Indexes](/database/index-tags#querying-an-index). |
| `tag` | str | Exact tag. |

### Errors

| code | message |
|---|---|
| `REQUIRE_LOGIN` | `This project requires users to sign in before reading its database, so "get_records" is not available to a signed-out visitor.` |
| `INVALID_PARAMETER` | `"table.access_group" is required: a table is always { name, access_group }. To read what references a record in every table, send "reference" without "table".` |
| `INVALID_PARAMETER` | `Key "table" is required.` |
| `INVALID_PARAMETER` | `"record_id" should be type: <string>.` / `"record_id" should only contain alphanumeric characters.` / `"unique_id" should be type: <string>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "table". allowed type or value is: Type<object>.` (also for `"index"`; `Type<string>` for `"reference"`) |
| `INVALID_PARAMETER` | `"index.value" should be type: number.` (a `$uploaded`, `$updated` or `$referenced_count` query) |
| `INVALID_PARAMETER` | `"index.value" is required.` / `"index.range" type should match the type of "index.value".` |
| `INVALID_PARAMETER` | `"tag" should be type: string.` |
| `NOT_EXISTS` | `Record does not exists.` / `Unique ID does not exists.` |
| `INVALID_REQUEST` | `No access to the record.` / `User has no private access.` |

`DeprecationWarning` (not an error): `table` written as a string. It means `{"name": ..., "access_group": "public"}`.

## delete_records

```python
skapi.delete_records(query: dict, fetch_options: dict | None = None) -> str | dict
```

Signed-in only. Deletes your records, and their files, by:

| query key | |
|---|---|
| `record_id` | str, or a list of up to 1000 |
| `unique_id` | str, or a list of up to 1000. Ignored when `record_id` is given. |
| `table`, `index`, `tag`, `reference` | a query, as in [get_records](#get-records); `table` is required, except with `{"reference": {"user_id": <your own ID>}}`. Deletes only your own records that are not read-only, in that one access group. |

Returns the server's message, such as `SUCCESS: records are being deleted. please give some time to finish the process.`, or a dict with the deleted records in `list` when the server answers with them. Admins can delete any record. See [Deleting records](/database/update-delete#deleting-records).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"record_id" is empty.` / `"unique_id" is empty.` (`""` or `[]`) |
| `INVALID_PARAMETER` | `"record_id" can hold at most 1000 ids.` |
| `INVALID_PARAMETER` | `"record_id[<i>]" should only contain alphanumeric characters.` / `"unique_id[<i>]" should be type: <string>.` |
| | the query errors of [get_records](#get-records) |

## get_tables

```python
skapi.get_tables(query: dict | None = None, fetch_options: dict | None = None) -> dict
```

No sign-in needed. Lists tables. See [get_tables](/database/index-tags#get-tables).

| query key | |
|---|---|
| `table` | A table name. Left out: every table. |
| `condition` | Left out: exact name. `">="` starts with, `"<="` ends with, `">"`, `"<"`, `"="`, `"!="` and the word forms `gt`, `gte`, `lt`, `lte`, `eq`, `ne`. |

Each item: `{"table", "number_of_records", "size", "number_of_records_in_access_group_<group>"...}`, with only the group counters the caller may see.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"table" should not be empty.` / `"table" is required for condition.` |

## get_tags

```python
skapi.get_tags(query: dict | None = None, fetch_options: dict | None = None) -> dict
```

No sign-in needed. Lists tags. See [get_tags](/database/index-tags#get-tags).

| query key | |
|---|---|
| `table` | Left out: every table. |
| `tag` | A tag. |
| `condition` | As in [get_tables](#get-tables). Left out: exact when both `table` and `tag` are given, otherwise starts with. |

With no query at all: every tag in the project, most used first. Each item: `{"table", "tag", "number_of_records"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"table" or "tag" is required for condition.` |

## get_indexes

```python
skapi.get_indexes(query: dict, fetch_options: dict | None = None) -> dict
```

No sign-in needed. Lists the indexes of a table. See [get_indexes](/database/index-tags#get-indexes).

| query key | |
|---|---|
| `table` | Required. |
| `index` | Left out: every index. A name: that index exactly. A name ending with `.`: its children. |
| `order` | `{"by", "value"?, "condition"?}`. `by`: `average_number`, `total_number`, `number_count`, `average_bool`, `total_bool`, `bool_count`, `string_count`, `index_name`, `number_of_records`. `value` alone matches exactly; `condition` as in [get_tables](#get-tables). With `index_name`, `">="` is starts with and `"<="` ends with. |

Each item: `{"table", "index", "number_of_records", "number_count", "boolean_count", "string_count", "total_number", "total_bool", "average_number", "average_bool"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"table" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "order". allowed type or value is: Type<object>.` |
| `INVALID_PARAMETER` | `"order.by" is required.` / `"<value>" is invalid in "by". allowed types or values are: ...` |
| `INVALID_PARAMETER` | `"value" is required for "condition".` |
| `INVALID_PARAMETER` | `"order.value" should be type: <string \| number \| boolean>.` |
| `INVALID_PARAMETER` | `"index" should be a parent index name of the compound index when using "order.by"` (an `index` not ending with `.`) |

## get_unique_id

```python
skapi.get_unique_id(query: dict | None = None, fetch_options: dict | None = None) -> dict
```

No sign-in needed. Lists unique IDs. See [get_unique_id](/database/index-tags#get-unique-id).

| query key | |
|---|---|
| `unique_id` | Left out: every unique ID. |
| `condition` | As in [get_tables](#get-tables). Left out: exact. |

Each item: `{"unique_id", "record_id"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `<value> is invalid in "unique_id". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `"unique_id" should not be empty.` / `"unique_id" is required for condition.` |

## upload_files

```python
skapi.upload_files(files: list[dict], record_id: str, service: str | None = None) -> dict
```

Attaches files to an existing record you can write. `files` is the same list as `files=` on [post_record](#post-record). Returns:

```python
{
    "completed": [filename, ...],
    "failed": [filename, ...],
    "errors": [{"file": filename, "name": key, "error": SkapiError}, ...],
    "bin_endpoints": [url_or_empty_string, ...],
}
```

Files go up one at a time; a refused file does not stop the rest. See [Adding files](/database/files#adding-files-to-an-existing-record).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"record_id" is required.` |
| `INVALID_PARAMETER` | the `files[<i>]` errors of [post_record](#post-record) |

## get_file

```python
skapi.get_file(url: str, config: dict | None = None) -> bytes | str | dict
```

Reads a record file by its `url`. See [Downloading files](/database/files#downloading-files).

| config key | |
|---|---|
| `dataType` | `"bytes"` (default): the content as `bytes`. `"text"`: a str, read as UTF-8. `"endpoint"`: a URL to open. `"info"`: a dict read from the URL, with no download. `"blob"` is read as `"bytes"`, and so is an unknown value. `data_type` is accepted too. |
| `save_to` | A path. The file is written there and the full path is returned. |
| `expires` | Seconds. Makes a signed link that works without sign-in until then; making it needs a signed-in user. |

`"info"` returns `{"url", "filename", "fileKey", "access_group", "uploader", "record_id", "filesize", "uploaded"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"url" should be type: string.` / `"<url>" is an invalid url.` / `Invalid file url.` |
| `INVALID_PARAMETER` | `Expires option can only be used on skapi cdn endpoints.` |
| `INVALID_PARAMETER` | `"config.expires" should be > 0. (seconds)` |
| `INVALID_REQUEST` | `User login is required.` (a file that is not public, or `expires`) |
| the storage's code, such as `AccessDenied` | an expired or refused signed link |

## delete_files

```python
skapi.delete_files(endpoints: str | list[str]) -> list[dict]
```

Signed-in only. Deletes files by URL (up to 1000, from any records) and returns the updated records. A URL with a `?t=` token (a file that is not public, or a link from `get_file`) is turned back into the file's stored address, so names with spaces or non-English characters work. If any file is refused, none is deleted. See [Deleting files by URL](/database/files#deleting-files-by-url).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"endpoints" should be type: array \| string.` |
| `INVALID_REQUEST` | `The record should be owned by the user.` |
| `INVALID_REQUEST` | `Only the owner of a private record can delete its files.` |
| `NOT_EXISTS` | `Record "<record_id>" does not exists.` |
| `INVALID_REQUEST` | `Invalid endpoint` / `Cannot delete more than 1000 files at once.` |
| `INVALID_REQUEST` | `"__data__/__json__.json" is a reserved file name.` |

## grant_private_record_access

```python
skapi.grant_private_record_access(params: dict) -> str
```

Signed-in only. `params`: `{"record_id": str, "user_id": str or list of up to 100}`. Returns the server's message. See [Granting access](/database/private#granting-access).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `<value> is invalid in "record_id". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `User ID is required.` / `Cannot process more than 100 users at once.` |
| `INVALID_PARAMETER` | `User ID in "user_id" is invalid.` |
| `INVALID_REQUEST` | `Record should be owned by the user.` |
| `INVALID_REQUEST` | `Private access cannot be granted to service owners.` |

## remove_private_record_access

```python
skapi.remove_private_record_access(params: dict) -> str
```

Signed-in only. Same `params` and client errors as [grant_private_record_access](#grant-private-record-access). Returns the server's message. The user cannot get a new private access key for the record after this, and a key they already hold stops working when it expires (within 1 hour).

On an [encrypted](/database/encryption#sharing-a-record) record, the record's key is replaced first and the access is removed after, so if replacing the key fails, the access stays as it was.

## list_private_record_access

```python
skapi.list_private_record_access(params: dict, fetch_options: dict | None = None) -> dict
```

Signed-in only. `params`: `{"record_id"?: str, "user_id"?: str or list}`, at least one. Each item in `list` has `record_id` and `user_id`. See [Listing grants](/database/private#listing-grants).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Either record_id or user_id must be provided.` |
| `INVALID_PARAMETER` | `user_id should be type: <string \| string[]>` / `User ID is invalid.` |

## request_private_record_access_key

```python
skapi.request_private_record_access_key(params: dict) -> str
```

Signed-in only. `params`: `{"record_id": str, "reference_id"?: str}`. Returns the key that opens the record's private files, and keeps it on the object. The key is valid for 1 hour; the kept key is returned until it is within a minute of expiring, then a fresh one is requested. [get_file](#get-file) calls this for you. `reference_id` is the record the private record references, when your access comes from that record. See [Private files](/database/private#private-files).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Record ID is required.` / `Record ID should be type: <string \| string[]>` / `Reference ID should be type: <string>` |
| `INVALID_REQUEST` | `User's private access for record: "<record_id>" does not exist.` / `User's private access for reference: "<reference_id>" does not exist.` |
| `ERROR` | `Invalid private access key response.` |
