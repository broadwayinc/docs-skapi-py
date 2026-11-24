# Fetching Records

[get_records](/api-reference/database#get-records) reads records. It takes a query and optional fetch options, and returns a dict:

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

result = skapi.get_records(
    {"table": {"name": "posts", "access_group": "public"}},
    {"limit": 20},
)

for record in result["list"]:
    print(record["record_id"], record["data"])
```

```python
{
    "list": [record, ...],
    "startKey": {...},        # or "end"
    "endOfList": False,
    "startKeyHistory": [...],
}
```

## What a query needs

Each query reads by **one** of these:

| You give | `table` |
|---|---|
| `record_id` or `unique_id` | Not needed. Returns that one record. |
| `reference` to a record, signed in | Not needed: searches every table. Add a `table` to read one table and group. |
| `reference` to a user ID, signed in | Not needed for your own ID. Needed for another user's. |
| nothing else, `index` or `tag` | **Required**, with `name` and `access_group`. |

A `table` without `access_group` raises `INVALID_PARAMETER`: `"table.access_group" is required: ...`. A query that needs a table and has none raises `Key "table" is required.`

## By record ID or unique ID

```python
rec = skapi.get_records({"record_id": "<record id>"})["list"][0]
rec = skapi.get_records({"unique_id": "album:getz-gilberto"})["list"][0]
```

Every other key is ignored, and `record_id` wins when both are given. A missing record raises `NOT_EXISTS` (`Record does not exists.` or `Unique ID does not exists.`). A record you may not read raises `INVALID_REQUEST`: `No access to the record.`, or `User has no private access.` for a [private](/database/private) one.

## From a table

```python
result = skapi.get_records({"table": {"name": "posts", "access_group": "authorized"}})
```

Access groups other than `"public"` need a signed-in user. See [Tables and Access Groups](/database/introduction).

## By index

```python
skapi.get_records({
    "table": {"name": "albums", "access_group": "public"},
    "index": {"name": "year", "value": 1960, "condition": ">="},
})

skapi.get_records({
    "table": {"name": "albums", "access_group": "public"},
    "index": {"name": "year", "value": 1960, "range": 1969},
})
```

`condition` is one of `"="` (default), `">"`, `">="`, `"<"`, `"<="` or `"eq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`. `range` reads from `value` to `range`, both included, and must be the same type as `value`. If both are given, `range` is dropped and `condition` is used. Strings, compound names and the special `$` indexes are in [Indexes](/database/index-tags#querying-an-index).

## By tag

```python
skapi.get_records({
    "table": {"name": "albums", "access_group": "public"},
    "tag": "jazz",
})
```

The tag matches exactly. It can be combined with `index`. To read records with one tag **or** another, query each tag and merge the lists by `record_id`.

## By reference

```python
# every record that references a post, in every table this user can read
skapi.get_records({"reference": "<record id or unique id>"})

# only the comments, in one access group
skapi.get_records({
    "table": {"name": "comments", "access_group": "public"},
    "reference": "<record id or unique id>",
})

# records a user uploaded to a table
skapi.get_records({
    "table": {"name": "comments", "access_group": "public"},
    "reference": "<user id>",
})
```

`reference` can also be a dict: `{"record_id": ...}`, `{"unique_id": ...}` or `{"user_id": ...}`. Signed-out callers always need `table`. Which records come back is in [References](/database/reference#fetching-references).

## Paging

The second argument controls paging:

| key | |
|---|---|
| `limit` | Records per call. Default 50, at most 1000. |
| `fetchMore` | `False` (default) always returns the first page. `True` returns the page after the last one this object fetched for the same query. |
| `ascending` | `True` (default) or `False` for the reverse order. |
| `startKey` | Start from this key, taken from an earlier result. `"start"` starts over. |

`fetch_more` and `start_key` are accepted as Python spellings.

```python
query = {"table": {"name": "posts", "access_group": "public"}}
options = {"limit": 100}

page = skapi.get_records(query, options)
handle(page["list"])

while not page["endOfList"]:
    page = skapi.get_records(query, {"limit": 100, "fetchMore": True})
    handle(page["list"])
```

`endOfList` is `True` on the last page, and `startKey` is then `"end"`. Asking for more after that returns an empty list. Fetch only what you need instead of walking a whole table.

The same options work on [get_tables](/api-reference/database#get-tables), [get_tags](/api-reference/database#get-tags), [get_indexes](/api-reference/database#get-indexes), [get_unique_id](/api-reference/database#get-unique-id) and [list_private_record_access](/api-reference/database#list-private-record-access).

## The record

Every record comes back as a dict:

```python
{
    "record_id": "...",
    "user_id": "...",                  # the uploader
    "unique_id": "album:getz-gilberto",  # only when set
    "table": {"name": "albums", "access_group": "public", "subscription": {...}},
    "data": {...},                     # what was posted
    "index": {"name": "year", "value": 1964},  # only when set
    "tags": ["jazz"],                  # only when set
    "reference": "...",                # record ID this record references, when set
    "source": {
        "referencing_limit": None,
        "prevent_multiple_referencing": False,
        "can_remove_referencing_records": False,
        "can_modify_referencing_records": False,
        "only_granted_can_reference": False,
    },
    "referenced_count": 0,             # records that reference this one
    "readonly": False,
    "uploaded": 1731600000000,         # milliseconds
    "updated": 1731600000000,
    "updated_by": "...",               # only when someone other than the uploader made the last update
    "ip": "203.0.113.7",               # "" unless you uploaded it, see below
    "bin": {"cover": [file, ...]},     # attached files, see Files
}
```

Each entry in `bin` is a dict with `access_group`, `filename`, `url`, `path`, `size` and `uploaded`. See [Files](/database/files#files-on-a-record).

`ip` is the address the record was posted from. Only the record's uploader, the project owner and admins in access group 99 get it; everyone else gets `""`. A record a signed-out user posted from an IPv4 address reads `"0.0.0.0"` for them, and its `user_id` still starts with `anonymous:`. One posted from an IPv6 address reads `""`, and its `user_id` has no `anonymous:` prefix, as before.

`updated_by` is there when the last update was made by someone other than the uploader: the user ID of the uploader of the record it references (see [Editing records that reference yours](/database/reference#editing-records-that-reference-yours)), of the project owner, or of an admin. It goes away when the uploader updates the record again. Read it with `record.get("updated_by")`.
