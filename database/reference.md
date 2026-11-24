# References

A record can **reference** one other record. Comments on a post, votes on a poll, items in an order: the child records reference the parent, and you fetch them by the parent's ID.

## Referencing a record

Put the parent's record ID or unique ID in `reference`:

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

post = skapi.post_record(
    {"text": "What do you think of this?"},
    {"table": {"name": "posts", "access_group": "public"}, "unique_id": "post:1"},
)

skapi.post_record(
    {"text": "I like it"},
    {"table": {"name": "comments", "access_group": "public"},
     "reference": post["record_id"]},     # or "post:1"
)
```

`reference` also takes a dict, `{"record_id": ...}` or `{"unique_id": ...}`. The saved record has the parent's record ID in `record["reference"]`, and the parent's `referenced_count` goes up by one.

To remove a reference, update the record with `"reference": None`:

```python
skapi.post_record(config={"record_id": "<comment id>", "reference": None})
```

The uploader of the parent can do this too when the parent allows it, see [Editing records that reference yours](#editing-records-that-reference-yours).

A user cannot reference a record in a higher access group than their own, or a private record, unless the uploader [granted them private access](/database/private) to it.

## Fetching references

```python
# the comments of a post, in one table and one access group
skapi.get_records({
    "table": {"name": "comments", "access_group": "public"},
    "reference": "post:1",
})

# every record that references the post, in every table (signed in only)
skapi.get_records({"reference": "post:1"})
```

Without `table`, what comes back depends on who asks:

| The caller | The list holds |
|---|---|
| uploaded the referenced record, or was granted private access to it | **every** record that references it, in every access group, private ones included |
| anyone else | referencing records in access groups up to their own; no private records |

Signed-out callers always need `table`. One call without `table` replaces one call per table, so prefer it to looping over tables.

A user ID in `reference` returns that user's records: your own in every table, or another user's in the `table` you name.

```python
skapi.get_records({
    "table": {"name": "comments", "access_group": "public"},
    "reference": "<user id>",
})
```

Sorting by the number of references, for example the posts with the most comments, uses the [`$referenced_count` index](/database/index-tags#special-indexes).

## Reference rules

`source` in the config of the **parent** sets rules for the records that reference it:

| key | |
|---|---|
| `referencing_limit` | How many records may reference this one. `None` (default) is no limit, `0` allows none. |
| `prevent_multiple_referencing` | `True`: each user may reference it only once. Good for votes. |
| `can_remove_referencing_records` | `True`: the uploader may delete records that reference it, and deleting it deletes them too. Good for a post owner removing comments. |
| `can_modify_referencing_records` | `True`: the uploader may change the `data`, `tags` and `index` of records that reference it, or unlink them. Can only be turned on when the record is created. See [Editing records that reference yours](#editing-records-that-reference-yours). |
| `only_granted_can_reference` | `True`: only users with [private access](/database/private) may reference it. |
| `allow_granted_to_grant_others` | `True`: users with private access may grant it to others. |
| `referencing_index_restrictions` | A list of index rules the referencing records must meet, see below. |

### Index restrictions

Each rule is a dict with `name` (required), and optionally `value` and `condition`. A referencing record must have an index with that name, of the same type as `value`, that meets the condition (`"="` when left out). The conditions are `"="`, `"!="`, `">"`, `">="`, `"<"`, `"<="` and the word forms `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.

A review board where 10 people can each rate once, below 5:

```python
skapi.post_record(
    {"title": "Rate the album Getz/Gilberto"},
    {
        "table": {"name": "reviews", "access_group": "public"},
        "unique_id": "reviews:getz-gilberto",
        "source": {
            "referencing_limit": 10,
            "prevent_multiple_referencing": True,
            "referencing_index_restrictions": [
                {"name": "rating", "value": 5, "condition": "<"},
            ],
        },
    },
)

skapi.post_record(
    {"comment": "Wonderful"},
    {
        "table": {"name": "reviews", "access_group": "public"},
        "reference": "reviews:getz-gilberto",
        "index": {"name": "rating", "value": 4.5},
    },
)
```

Use a number for the rating so [get_indexes](/database/index-tags#get-indexes) can report the total and average.

`referencing_limit` must be a number from 0 up, or `None`. A rule with a `range` key is refused (`INVALID_PARAMETER`: `Index restriction "range" type should match the type of "value".`), so express ranges with `condition`.

::: warning
A user with private access to a record can read every record that references it, private ones included. If that is not what you want, do not let users post private records that reference other records.
:::

## Editing records that reference yours

Post a record with `"can_modify_referencing_records": True` in `source`, and its uploader can edit the records other users post under it: a post owner who fixes or hides comments, or an event host who marks entries as checked. They are still other users' records; only some of their keys can change.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

post = skapi.post_record(
    {"text": "Ask me anything"},
    {
        "table": {"name": "posts", "access_group": "public"},
        "source": {"can_modify_referencing_records": True},
    },
)

# later, signed in as the post's uploader: edit a comment another user posted under the post
skapi.post_record(
    {"text": "[removed by the author of the post]"},
    {"record_id": "<comment id>", "tags": ["hidden"]},
)

# or take the comment off the post
skapi.post_record(config={"record_id": "<comment id>", "reference": None})
```

The update is an ordinary [post_record](/api-reference/database#post-record) with the referencing record's `record_id`. What the parent's uploader may send:

| Can change | Refused |
|---|---|
| `data` | the `table` name or access group, and `subscription` settings |
| `tags` | `readonly` and `unique_id` |
| `index` | any `source` setting |
| `"reference": None` (unlink) | `remove_bin` |
| | `reference` pointing at any record (only `None` is allowed) |

- The record stays its uploader's: `user_id` does not change. It gets [`updated_by`](/database/fetch#the-record), the user ID of the parent's uploader, until its own uploader saves it again.
- Records in the `"private"` access group and read-only records cannot be edited this way, nor a record in an access group above the editor's own.
- While the record still references the parent, the parent's [`referencing_index_restrictions`](#index-restrictions) apply to the new `index`.
- The right lasts while the record references the parent and the parent keeps the setting on. Once unlinked, the record is out of the parent uploader's reach.
- The record's own uploader can still update it in full.

Files cannot be attached either, but `post_record` does not raise for them: the record is saved first, then each file asks for an upload permit, and those permits are refused (`User has no access to update this record.`). So a `post_record` call with `files=` saves its `data`, `tags`, `index` or `reference` change and returns without attaching the files. [upload_files](/api-reference/database#upload-files) on such a record lists each file in `"failed"`. Do not pass `files=` when changing another user's record.

The setting can only be turned on when the parent is created, so the users who reference a record can see it in `source` before they post under it:

```python
parent = skapi.get_records({"record_id": "<post id>"})["list"][0]
if parent["source"]["can_modify_referencing_records"]:
    print("The author of this post can edit your comment.")
```

Its uploader can turn it off later with `"source": {"can_modify_referencing_records": False}`. Turning it on for a record that already exists is refused, unless the caller is the project owner or an admin in access group 99.

| code | message | when |
|---|---|---|
| `INVALID_REQUEST` | `"source.can_modify_referencing_records" can only be set when the record is created. Only the project owner and admins in access group 99 can turn it on for an existing record.` | turning it on in an update |
| `INVALID_REQUEST` | `The referenced record's user can only change the data, tags and index of a record that references theirs, or unlink it (<key> differs).` | the update changes anything else, for example `(table.access_group differs)` or `(remove_bin differs)` for `"remove_bin": None` |
| `INVALID_REQUEST` | `The binary should be owned by the user.` | `remove_bin` names file URLs: the files belong to the user who posted the record |
| `INVALID_REQUEST` | `The referenced record's user cannot update a private record.` | the referencing record is in `"private"` |
| `INVALID_REQUEST` | `Record is read only.` | the referencing record is read-only |
| `INVALID_REQUEST` | `User has no access to this group.` | the referencing record is in an access group above yours |
| `INVALID_REQUEST` | `User has no access to update this record.` | the record does not reference yours, or your record does not have the setting on |
