# Getting Started

skapi-py is the Skapi API for Python. It signs users in, keeps their sessions, and reads and writes your project's database, with the same queries, answers and error codes as [skapi-js](https://docs.skapi.com). Use it in scripts, servers, data jobs and command line tools.

## Requirements

- Python 3.9 or later. No other packages: skapi-py uses only the standard library. [Record encryption](/database/encryption) is the one exception: it needs `cryptography`, installed with `pip install "skapi[encryption]"`.
- A Skapi project. Create one on [skapi.com](https://www.skapi.com) and copy its **Project ID** from the project's **Settings** page.

## Install

```
pip install skapi
```

## Connect to your project

```python
from skapi import Skapi

skapi = Skapi("<Project ID>")

info = skapi.get_connection_info()
print(info["service_name"])  # your project's name
```

One `Skapi` object works with one project. It connects on its first call, not when it is created.

## Your first records

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

# sign in (create the account first with skapi.signup(), see Signing Up Users)
skapi.login("user@example.com", "password")

# write a record
record = skapi.post_record(
    {"title": "Hello", "body": "My first record"},
    {"table": {"name": "posts", "access_group": "public"}},
)
print(record["record_id"])

# read records back
result = skapi.get_records({"table": {"name": "posts", "access_group": "public"}})
for post in result["list"]:
    print(post["data"]["title"])
```

## Names in Python

Methods use Python names, and everything you pass to them uses the same keys as skapi-js, so a query reads the same in both:

| skapi-js | skapi-py |
|---|---|
| `skapi.getRecords({ table: { name: 'posts', access_group: 'public' } })` | `skapi.get_records({"table": {"name": "posts", "access_group": "public"}})` |
| `skapi.postRecord(data, config)` | `skapi.post_record(data, config)` |
| `skapi.login({ email, password })` | `skapi.login(email, password)` |

Answers are plain `dict`s and `list`s with the same keys skapi-js returns.

## Keeping users signed in between runs

By default the session lives as long as the `Skapi` object. To stay signed in when your script runs again, give `storage` a file path:

```python
skapi = Skapi("<Project ID>", storage="~/.myapp/skapi-session.json")

if skapi.user is None:
    skapi.login("user@example.com", "password")
```

The file holds the user's tokens. skapi-py creates it readable by you only; keep it out of version control. You can also pass any object with `get_item(key)`, `set_item(key, value)` and `remove_item(key)` methods, for example to keep sessions in your own database.

## Options

```python
Skapi(project_id, storage=None, timeout=120)
```

| option | default | what it does |
|---|---|---|
| `storage` | `None` (memory) | where the signed-in session is kept: `None`, a file path, or a storage object |
| `timeout` | `120` | seconds: how long a request may go with nothing moving before it fails. An upload that keeps moving is never cut off; once a file is fully sent, its answer may take 5 × `timeout` |

## Threads

A `Skapi` object holds one signed-in user. Use one object per thread, and for a server that acts for many users at once, one object per user, each with its own `storage`.

## Next

- [Signing Up Users](/authentication/signup) and [Login / Logout](/authentication/login)
- [Tables and Access Groups](/database/introduction)
- [Errors](/introduction/errors)
