# Getting Started

skapi-py is the Skapi API for Python. It signs users in, keeps their sessions, and reads and writes your project's database, with the same queries, answers and error codes as [skapi-js](https://docs.skapi.com). Use it in client applications: command line tools and scripts.

## Requirements

- Python 3.9 or later. No other packages: skapi-py uses only the standard library. [Record encryption](/database/encryption) is the one exception: it needs `cryptography`, installed with `pip install "skapi[encryption]"`.
- A Skapi project. Create one on [skapi.com](https://www.skapi.com) and copy its **Project ID** from the project's **Settings** page.

## Install

```
pip install skapi
```

### macOS: `CERTIFICATE_VERIFY_FAILED` on the first call

With Python installed from python.org on a Mac, the first call can fail with:

```
skapi.errors.SkapiError: NETWORK_ERROR: Network error: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate
```

This means Python could not check skapi's HTTPS certificate because it has no list of trusted certificates yet. That Python does not use the Mac's own list, and it gets one of its own only when you run **Install Certificates.command**. It affects every HTTPS call from that Python, not only skapi. Fix it once, in either of these ways:

- Open the Python folder in **Applications** (for example `Python 3.13`) and double-click **Install Certificates.command**.
- Or point Python at the Mac's own list when you run your program:

  ```
  SSL_CERT_FILE=/etc/ssl/cert.pem python your_app.py
  ```

Certificates are still checked either way. Python from Homebrew, Linux and Windows does not need this.

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

A `Skapi` object holds one signed-in user. Use one object per thread, and when a program signs in more than one user at once, one object per user, each with its own `storage`.

## Building With Your AI Agent

An AI coding agent can write your skapi-py program. Give it Skapi's base prompt for skapi-py:

- **[SKAPI.md](https://py.skapi.com/SKAPI.md)** (<a href="/SKAPI.md" download="SKAPI.md">download</a>): the rules for building a Python client application, a map of this documentation and an index of every skapi-py method. Each entry links to its page under `https://py.skapi.com/md/` (every page of this site as raw markdown), and the agent opens a page when it builds that feature, so it needs to be able to open public web pages.

To use it:

1. Download the file.
2. Save it in your project folder under the name your agent reads (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md` ...), or attach it to your chat.
3. Ask the agent to use it as its base prompt, with your Project ID:

```text
Use SKAPI.md as your base prompt.
My Skapi project ID is "<Project ID>".
Build me a [describe what you want].
```

With the [Skapi MCP server](https://mcp.skapi.com) connected, the agent can also create a project, register Secret Keys and Tickets, and read this documentation through its `readDocs` tool.

## Next

- [Signing Up Users](/authentication/signup) and [Login / Logout](/authentication/login)
- [Tables and Access Groups](/database/introduction)
- [Errors](/introduction/errors)
