# Searching Users

Signed-in users can look up other users of your project with [`get_users()`](/api-reference/users#get-users). Only the profile fields each user made public come back.

```python
result = skapi.get_users()
for u in result["list"]:
    print(u["user_id"], u.get("name"))
```

Without parameters, `get_users()` lists every user, newest sign-up first.

## Search by one field

Pass `searchFor` (the field), `value`, and optionally `condition` or `range`:

```python
# names starting with "Baksa" (">=" on text means "starts with")
skapi.get_users({"searchFor": "name", "condition": ">=", "value": "Baksa"})

# users who signed up before 2023-01-01 (timestamp in milliseconds)
skapi.get_users({"searchFor": "timestamp", "condition": "<", "value": 1672531200000})

# birthdays between 1985 and 1990
skapi.get_users({"searchFor": "birthdate", "value": "1985-01-01", "range": "1990-12-31"})

# several users at once by their IDs (or e-mails)
skapi.get_users({"searchFor": "user_id", "value": ["<user id>", "<another user id>"]})
```

| `searchFor` | value type |
|---|---|
| `user_id` | user ID string |
| `email`, `phone_number`, `name`, `address`, `gender`, `approved` | string |
| `birthdate` | `"YYYY-MM-DD"` |
| `locale` | country code, such as `"US"` |
| `timestamp` (sign-up time, ms), `subscribers`, `access_group` | number |

`condition` is one of `"="` (default), `">"`, `">="`, `"<"`, `"<="` (or `"gt"`, `"gte"`, `"eq"`, `"lt"`, `"lte"`). A `range` searches from `value` to `range` and cannot be combined with a condition. A list of values works only with `"="` and no range.

A field a user did not make public cannot be searched, and is not in their result.

## Paging

`get_users()` takes the same paging options as [`get_records()`](/database/fetch): `limit`, `fetchMore`, `ascending`.

```python
page = skapi.get_users({"searchFor": "timestamp", "condition": ">", "value": 0}, {"limit": 50, "fetchMore": True})
while page["list"]:
    for u in page["list"]:
        print(u["user_id"])
    if page["endOfList"]:
        break
    page = skapi.get_users({"searchFor": "timestamp", "condition": ">", "value": 0}, {"limit": 50, "fetchMore": True})
```
