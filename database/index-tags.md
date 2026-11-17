# Indexes, Tags and Unique IDs

## Indexes

A record can carry one index: a `name` and a searchable `value`. Skapi also keeps the count, sum and average of the values under each index name.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

skapi.post_record(
    {"title": "Getz/Gilberto", "tracks": 10},
    {"table": {"name": "albums", "access_group": "public"},
     "index": {"name": "year", "value": 1964}},
)
```

| | Rules |
|---|---|
| `name` | 1 to 256 characters, no control characters, cannot start with `$`. `/ ! * # %` count as 3 each. |
| `value`, str | 0 to 256 characters, no control characters. |
| `value`, number | From -4503599627370496 to 4503599627370496 (plus or minus 2<sup>52</sup>). Decimals and negatives are fine. |
| `value`, bool | `True` or `False`. |

A query only matches values of the same type: `"2"` and `2` are different values.

### Querying an index

```python
skapi.get_records({
    "table": {"name": "albums", "access_group": "public"},
    "index": {"name": "year", "value": 1960, "condition": ">"},
})
```

| `condition` | Numbers and booleans | Strings |
|---|---|---|
| `"="`, `"eq"` (default) | equal | equal |
| `">"`, `"gt"` / `"<"`, `"lt"` | greater / less | after / before, in character order |
| `">="`, `"gte"` | greater or equal | **starts with** |
| `"<="`, `"lte"` | less or equal | **ends with** |

An "ends with" search comes back ordered by the value read backwards, so sort the list yourself if you need it by value.

`range` reads every value from `value` to `range`, both included. It must be the same type as `value`, and it cannot be combined with `condition` (if both are given, `range` is dropped):

```python
skapi.get_records({
    "table": {"name": "albums", "access_group": "public"},
    "index": {"name": "year", "value": 1960, "range": 1969},
})
```

### Special indexes

These names need no index on the record:

| name | value | |
|---|---|---|
| `"$uploaded"` | number (ms) | when the record was created |
| `"$updated"` | number (ms) | when it was last changed |
| `"$referenced_count"` | number | how many records reference it ("posts with the most comments") |
| `"$user_id"` | user ID | records uploaded by that user; no `condition` or `range` |

```python
# albums uploaded after 2021-01-01
skapi.get_records({
    "table": {"name": "albums", "access_group": "public"},
    "index": {"name": "$uploaded", "value": 1609459200000, "condition": ">"},
})
```

### Compound index names

Join parts of a name with dots, and you can query each level:

```python
skapi.post_record({"title": "Dukkha"}, {
    "table": {"name": "albums", "access_group": "public"},
    "index": {"name": "Band.AsianSpiceHouse.year", "value": 2023},
})
```

A name that **ends with a dot** queries the next part of the name as a string:

```python
table = {"name": "albums", "access_group": "public"}

# every album by any "Band"
skapi.get_records({"table": table, "index": {"name": "Band.", "value": "", "condition": ">"}})

# bands whose name starts with "Asian"
skapi.get_records({"table": table, "index": {"name": "Band.", "value": "Asian", "condition": ">="}})

# bands whose name ends with "House"
skapi.get_records({"table": table, "index": {"name": "Band.", "value": "House", "condition": "<="}})

# the value itself needs the full name
skapi.get_records({"table": table, "index": {"name": "Band.AsianSpiceHouse.year", "value": 2010, "condition": ">"}})
```

Levels cannot be skipped: `"Band.year"` does not find `"Band.AsianSpiceHouse.year"`.

## Tags

A record can carry any number of tags. Tags are 1 to 256 characters, with no control characters.

```python
skapi.post_record(
    {"title": "Dukkha"},
    {"table": {"name": "albums", "access_group": "public"},
     "tags": ["indie", "experimental"]},   # or "indie, experimental"
)

skapi.get_records({
    "table": {"name": "albums", "access_group": "public"},
    "tag": "experimental",
})
```

A tag query matches the tag exactly and needs a `table`. It can be combined with an `index`. Tags have no conditions; to find spellings, list them with [get_tags](#get-tags).

## Unique IDs

A `unique_id` is your own ID for a record, such as an order number. It is unique across the project, and works wherever a record ID does: in [get_records](/database/fetch#by-record-id-or-unique-id), as `record_id` in an update, in `reference`, and in [delete_records](/database/update-delete#deleting-records).

```python
skapi.post_record({"total": 59.0}, {
    "table": {"name": "orders", "access_group": "private"},
    "unique_id": "order:1042",
})

order = skapi.get_records({"unique_id": "order:1042"})["list"][0]
```

Signed-out callers cannot set a unique ID.

Unique IDs that start with `src::` are reserved for records that describe files in your project's file storage, and those records are deleted when the file is. Do not use the prefix for your own IDs.

## Table, tag and index information

These listings answer anyone who knows the Project ID, signed in or not, and the Require Login setting does not apply. Tag, index and unique ID listings are **not** filtered by access group, so do not put anything secret in a table name, tag, index name or unique ID. Each takes the [paging options](/database/fetch#paging) as its second argument.

### get_tables

```python
skapi.get_tables()                                      # every table
skapi.get_tables({"table": "posts"})                    # exactly "posts"
skapi.get_tables({"table": "my_", "condition": ">="})   # names starting with "my_"
skapi.get_tables({"table": "_archive", "condition": "<="})  # names ending with "_archive"
```

Each item: `table`, `number_of_records`, `size`, and `number_of_records_in_access_group_<group>` for the groups you may see (`public` for everyone, up to your own group when signed in).

### get_tags

```python
skapi.get_tags()                                                # every tag, most used first
skapi.get_tags({"table": "albums"})                             # every tag in "albums"
skapi.get_tags({"tag": "jazz"})                                 # "jazz" in every table
skapi.get_tags({"table": "albums", "tag": "jazz"})              # exactly "jazz" in "albums"
skapi.get_tags({"table": "albums", "tag": "ja", "condition": ">="})  # starting with "ja"
```

Each item: `table`, `tag`, `number_of_records`.

### get_indexes

`table` is required.

```python
skapi.get_indexes({"table": "albums"})                    # every index
skapi.get_indexes({"table": "albums", "index": "year"})   # exactly "year"
skapi.get_indexes({"table": "albums", "index": "Band."})  # the children of "Band."
```

Each item: `table`, `index`, `number_of_records`, `number_count`, `boolean_count`, `string_count`, `total_number`, `total_bool`, `average_number`, `average_bool`.

`order` sorts and filters by one of those numbers, or by name. With a compound name, give the parent (ending with a dot) in `index`:

```python
# "Vote.Beer", "Vote.Wine", ... rated above 50%, best first
skapi.get_indexes(
    {"table": "votes", "index": "Vote.",
     "order": {"by": "average_bool", "value": 0.5, "condition": ">"}},
    {"ascending": False},
)

# index names starting with "Vote"
skapi.get_indexes({"table": "votes", "order": {"by": "index_name", "value": "Vote", "condition": ">="}})
```

`order.by` is one of `average_number`, `total_number`, `number_count`, `average_bool`, `total_bool`, `bool_count`, `string_count`, `index_name`, `number_of_records`. `order.condition` needs `order.value`; a `value` without `condition` matches exactly, and `by` alone returns everything sorted.

### get_unique_id

```python
skapi.get_unique_id()                                              # every unique ID
skapi.get_unique_id({"unique_id": "order:1042"})                   # exactly this one
skapi.get_unique_id({"unique_id": "order:", "condition": ">="})    # starting with "order:"
```

Each item: `unique_id`, `record_id`.

For `get_tables`, `get_tags` and `get_unique_id`, `condition` is `"="` (default), `">"`, `">="` (starts with), `"<"`, `"<="` (ends with), `"!="`, or the word forms `eq`, `gt`, `gte`, `lt`, `lte`, `ne`.
