# Updating and Deleting

## Updating a record

Call [post_record](/api-reference/database#post-record) with the record's `record_id` in the config. Only the keys you send change; everything else on the record stays as it is. You must be signed in, and the record must be yours. The one exception: the uploader of a record with `can_modify_referencing_records` on can change some keys of the records that reference it, see [Editing records that reference yours](/database/reference#editing-records-that-reference-yours).

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

rec = skapi.post_record(
    {"title": "Hello again", "body": "Edited"},  # replaces the stored data
    {"record_id": "<record id>"},
)
```

`record_id` also takes the record's [unique ID](/database/index-tags#unique-ids).

### Keeping or replacing the data

| You pass | The stored data |
|---|---|
| a value | is replaced by it, whole. Keys you leave out of the new dict are gone. |
| nothing (`config=` only) | is kept. |
| `None` | becomes `null`. |

To change only the config, leave `data` out by passing `config` by name:

```python
skapi.post_record(config={
    "record_id": "<record id>",
    "tags": ["featured"],
})
```

::: warning
`skapi.post_record(None, {...})` is not the same: it overwrites the data with `null`.
:::

### Removing things

| To remove | Send |
|---|---|
| the index | `"index": None` |
| every tag | `"tags": None` |
| the reference | `"reference": None` |
| the unique ID | `"unique_id": None` |
| some files | `"remove_bin": [file or url, ...]`, see [Files](/database/files#removing-files) |
| every file | `"remove_bin": None` |

### Moving between access groups

A `table` without `access_group` keeps the record where it is. Name the group to move it:

```python
skapi.post_record(config={
    "record_id": "<record id>",
    "table": {"name": "notes", "access_group": "authorized"},
})
```

Moving a record into or out of `"private"` removes every [private access grant](/database/private) on it, and only the record's uploader can do it.

### Refusals

| code | message | when |
|---|---|---|
| `INVALID_REQUEST` | `User has no access to update this record.` | the record is someone else's |
| `INVALID_REQUEST` | `The referenced record's user can only change the data, tags and index of a record that references theirs, or unlink it (<key> differs).` | the record is someone else's and references yours: only `data`, `tags`, `index` and `"reference": None` can change |
| `INVALID_REQUEST` | `Record is read only.` | the record was created with `readonly: True` |
| `INVALID_REQUEST` | `Public users cannot update existing records.` | you are signed out |

## Deleting records

[delete_records](/api-reference/database#delete-records) needs a signed-in user. Files attached to a deleted record are deleted with it.

```python
# one record
skapi.delete_records({"record_id": "<record id>"})

# up to 1000 at once
skapi.delete_records({"record_id": ["<id 1>", "<id 2>", "<id 3>"]})

# by unique ID (also a list of up to 1000)
skapi.delete_records({"unique_id": "album:getz-gilberto"})

# every record you uploaded to the public group of "drafts"
skapi.delete_records({"table": {"name": "drafts", "access_group": "public"}})
```

A delete by query takes the same keys as [get_records](/database/fetch): `table`, `index`, `tag`, `reference`. It deletes only your own records, skips read-only ones, and leaves the table's other access groups alone. It returns the server's message, such as `SUCCESS: records are being deleted. please give some time to finish the process.`, and a large delete can take a moment to show in later reads.

An empty `record_id` or `unique_id` (`""` or `[]`) raises `INVALID_PARAMETER`: `"record_id" is empty.` More than 1000 IDs raises `"record_id" can hold at most 1000 ids.`

::: danger
On a string index value, `condition: "<="` means **ends with**. Run the same query through `get_records` first and check the list before you delete with it.
:::

Admins can delete any record, private and read-only ones included.
