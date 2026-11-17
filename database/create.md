# Creating Records

[post_record](/api-reference/database#post-record) creates a record, or [updates one](/database/update-delete) when the config has a `record_id`. It returns the saved record as a dict (see [The record](/database/fetch#the-record)).

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

record = skapi.post_record(
    {"title": "Hello", "body": "My first post"},             # data
    {"table": {"name": "posts", "access_group": "public"}},  # config
)
print(record["record_id"], record["data"]["title"])
```

## data

`data` is any JSON value: a dict, a list, a string, a number, a boolean, or `None`.

- **Left out**, the stored data is kept. This only matters on an update: `skapi.post_record(config={...})`.
- **`None`** stores `null`.
- **Up to 2 MB** as JSON. More raises `INVALID_REQUEST`: `Data should not exceed 2MB`. A value that is not JSON (a `set`, a `datetime`) raises `INVALID_REQUEST`: `Invalid data type.`

Data larger than 32 KB is kept in file storage instead of the database. You do not have to do anything about it: reading the record gives back the value you posted.

## config

| key | type | |
|---|---|---|
| `table` | dict | `{"name", "access_group"}`. Required when creating. A left-out `access_group` means `"public"` when creating (signed-out callers must write it), and keeps the record's group when updating. See [access groups](/database/introduction#access-groups). |
| `record_id` | str | Update this record instead of creating one. A unique ID works too. |
| `unique_id` | str or `None` | Your own ID for the record, unique in the project. `None` removes it on an update. See [Unique IDs](/database/index-tags#unique-ids). |
| `readonly` | bool | `True` makes the record unchangeable. |
| `index` | dict or `None` | `{"name", "value"}`, one searchable value: a str, number or bool. `None` removes it. See [Indexes](/database/index-tags). |
| `tags` | list of str, or a comma-separated str | Labels to search by. `[]` removes them on an update. See [Tags](/database/index-tags#tags). |
| `reference` | str, dict or `None` | The record ID or unique ID of a record this one refers to. `None` removes it. See [References](/database/reference). |
| `source` | dict | Rules for records that reference this one. See [Reference rules](/database/reference#reference-rules). |
| `remove_bin` | list or `None` | Updates only: files to take off the record. See [Files](/database/files#removing-files). |

`files=` (the third argument) attaches files. See [Files](/database/files).

## Read-only records

```python
rec = skapi.post_record(
    {"order": 1042, "total": 59.0},
    {"table": {"name": "orders", "access_group": "private"}, "readonly": True},
)
```

A read-only record cannot be updated or deleted by its uploader. An update raises `INVALID_REQUEST`: `Record is read only.`

## Tags, index and unique ID

```python
skapi.post_record(
    {"title": "Getz/Gilberto", "artist": "Stan Getz, Joao Gilberto"},
    {
        "table": {"name": "albums", "access_group": "public"},
        "unique_id": "album:getz-gilberto",
        "index": {"name": "year", "value": 1964},
        "tags": ["jazz", "bossa nova"],
    },
)
```

Each record has at most one index and any number of tags. How to query them is in [Indexes, Tags and Unique IDs](/database/index-tags).

## Reference and source

```python
post = skapi.post_record(
    {"text": "What do you think?"},
    {"table": {"name": "posts", "access_group": "public"},
     "source": {"prevent_multiple_referencing": True}},
)

skapi.post_record(
    {"text": "I like it"},
    {"table": {"name": "comments", "access_group": "public"},
     "reference": post["record_id"]},
)
```

See [References](/database/reference).

## Many records at once

[post_records](/api-reference/database#post-records) takes a list of `{"data", "config"}` items and saves them 100 to a request. A thousand rows are ten requests instead of a thousand.

```python
result = skapi.post_records([
    {"data": row, "config": {"table": {"name": "imports", "access_group": "public"}}}
    for row in rows
])

print(len(result["list"]), "saved")
for f in result["failed"]:
    print(f["index"], f["code"], f["message"])
```

```python
{
    "list": [record, ...],   # the saved records, in the order given
    "failed": [              # the items that were not saved, by position
        {"index": 7, "code": "INVALID_PARAMETER", "message": "..."},
    ],
}
```

Each item follows the rules of `post_record`, with the same config keys. A refused item does not stop the others, and `len(list) + len(failed)` is the number of items. Only a failed request (network, sign-in, a server error) raises; records saved by earlier requests stay saved. `post_records` does not attach files: use [upload_files](/database/files#adding-files-to-an-existing-record) on the saved records.
