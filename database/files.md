# Files

Files are attached to records. They follow the record's access group and are served through a CDN.

## Uploading with a record

Pass `files=` to [post_record](/api-reference/database#post-record). Each entry is a dict:

| key | |
|---|---|
| `name` | The key the file is listed under in the record's `bin`, like a form field name. Several files can share one name. |
| `file` | A path (str or `pathlib.Path`), `bytes`, or an open file object. |
| `filename` | The stored file name. Required for `bytes`; defaults to the file's own name otherwise. |
| `content_type` | Defaults to a guess from the file name. |

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

rec = skapi.post_record(
    {"caption": "Holiday"},
    {"table": {"name": "photos", "access_group": "authorized"}},
    files=[
        {"name": "picture", "file": "./beach.jpg"},
        {"name": "picture", "file": png_bytes, "filename": "sunset.png"},
        {"name": "document", "file": open("trip.pdf", "rb")},
    ],
)
```

The files are read and checked before the record is created, so a bad entry raises `INVALID_PARAMETER` and nothing is saved. A file storage refuses afterwards does not fail `post_record`; use [upload_files](#adding-files-to-an-existing-record) when you need to know about each file.

To attach files to an existing record of yours without changing anything else, use `post_record(config={"record_id": ...}, files=[...])` or `upload_files`.

## Adding files to an existing record

[upload_files](/api-reference/database#upload-files) takes the same list and a record ID, and reports on each file:

```python
result = skapi.upload_files(
    [{"name": "picture", "file": "./more.jpg"}],
    "<record id>",
)
```

```python
{
    "completed": ["more.jpg"],       # stored
    "failed": [],                    # not stored
    "errors": [],                    # {"file": filename, "name": key, "error": SkapiError}, one per failed file
    "bin_endpoints": ["https://..."],  # one per file, in order; "" when no upload permit was given
}
```

Files go up one after another, and a refused file does not stop the rest. With five files or more, the upload permits are asked for in batches of 100.

## Files on a record

```python
rec = skapi.get_records({"record_id": "<record id>"})["list"][0]

for f in rec["bin"]["picture"]:
    print(f["filename"], f["size"], f["url"])
```

Each file is a dict:

```python
{
    "access_group": "authorized",
    "filename": "beach.jpg",
    "url": "https://...",
    "path": "...",
    "size": 482113,         # bytes
    "uploaded": 1731600000000,  # milliseconds
}
```

A file in a `"public"` record has a plain CDN link anyone can open. For other access groups, `url` already carries your sign-in token, so it works for a limited time. Use [get_file](#downloading-files) to read the file or to get a fresh link.

## Downloading files

[get_file](/api-reference/database#get-file) takes a file's `url`. `dataType` chooses what you get back:

```python
f = rec["bin"]["picture"][0]

content = skapi.get_file(f["url"])                          # bytes (default)
text = skapi.get_file(f["url"], {"dataType": "text"})       # str, read as UTF-8
link = skapi.get_file(f["url"], {"dataType": "endpoint"})   # a URL to open
info = skapi.get_file(f["url"], {"dataType": "info"})       # details, no download
path = skapi.get_file(f["url"], {"save_to": "./beach.jpg"}) # writes the file, returns the full path
```

`"info"` reads the details from the URL itself:

```python
{
    "url": "https://...",
    "filename": "beach.jpg",
    "fileKey": "picture",
    "access_group": "authorized",
    "uploader": "<user id>",
    "record_id": "<record id>",
    "filesize": 482113,
    "uploaded": 1731600000000,
}
```

You need access to the record to read its files. Files of records that are not `"public"` need a signed-in user. For a [private](/database/private#private-files) file you were granted access to, skapi-py fetches the access key for you.

### Links that work without sign-in

`expires` (seconds) makes a signed link that anyone can open until it expires, without signing in. Making it needs a signed-in user with access to the file.

```python
link = skapi.get_file(f["url"], {"dataType": "endpoint", "expires": 3600})
```

Without `dataType: "endpoint"`, the file is downloaded through that link. A signed link passed back to `get_file` is opened as it is. `expires` only works on Skapi file URLs (`INVALID_PARAMETER`: `Expires option can only be used on skapi cdn endpoints.`).

## Removing files

Update the record with `remove_bin`, a list of files from its `bin` or their `url`s:

```python
rec = skapi.get_records({"record_id": "<record id>"})["list"][0]

skapi.post_record(config={
    "record_id": rec["record_id"],
    "remove_bin": [rec["bin"]["picture"][0]],   # or [rec["bin"]["picture"][0]["url"]]
})

# every file on the record
skapi.post_record(config={"record_id": rec["record_id"], "remove_bin": None})
```

An empty list removes nothing.

The files must belong to the record you update.

### Deleting files by URL

[delete_files](/api-reference/database#delete-files) deletes files by URL without touching anything else on the records. It takes one URL or a list of up to 1000, from any records of yours, and returns the updated records. A link from `get_file(..., {"dataType": "endpoint"})` works too, and so does the `url` of a file that is not public (it ends in `?t=...`): skapi-py sends the file's stored address, for any file name, including names with spaces or non-English characters. `remove_bin` takes these URLs the same way.

One case is still read wrong: a name that itself holds an encoded sequence, such as `a%20b.pdf`, deleted through a saved `?t=` URL that this `Skapi` object did not hand out. Pass the file from `bin`, or its `path`, for such names.

```python
records = skapi.delete_files([f["url"] for f in rec["bin"]["picture"]])
```

The whole list is checked first: if any file is refused, none is deleted.

Deleting a record deletes its files too.
