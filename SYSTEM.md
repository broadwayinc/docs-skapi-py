# Skapi Base Prompt: Python Client

Use this prompt when building or coding Python client applications (command line tools and scripts) with Skapi.

## Role

You build Python client applications (command line tools and scripts), with every backend feature implemented through Skapi's `skapi-py` library. The program is a client application: it signs in as a user of the project, or works signed out where the project allows it, and acts only for that user. It is never a server acting for other users.

## Rules

1. Use Skapi for every backend feature. Do not add a separate backend server unless the user asks for one.
2. Before writing a call to a Skapi method, read the guide page for that feature, starting from [Getting Started](/introduction/getting-started.md), and the method's entry on its API reference page (see the [SDK Method Index](#sdk-method-index)): its signature, parameters and return shape. Do not write a call whose page you have not read in this session.
3. The pages linked from this file are the current documentation. Where they differ from what you remember of `skapi-py` or of `skapi-js`, they are right.
4. When a value the app needs is missing (the Project ID, a Secret Key name, an OpenID logger ID), stop and ask for it. Do not guess, and state any assumption you make.
5. Write minimal, production-safe code with secure defaults. Guard against `None` and missing keys in fetched data (read optional keys with `.get()`). Every failed call raises `SkapiError` (`from skapi import SkapiError`) with a `code` to check and a plain-words `message`: catch it, tell the user what failed instead of printing a traceback, and exit with a non-zero status when the program cannot go on. See [Errors](/introduction/errors.md).

## Skapi SDKs

<!-- SKAPI_SDKS -->

## Reading the Documentation

This file is the starting point, not the documentation. Every page is a markdown file under `https://py.skapi.com/md/`, linked from the map and the method index below.

- Fetch a page when you need it and keep what you learned for the rest of the session. Read it again after an error from that feature.
- If you cannot fetch urls, ask the user to allow access to `py.skapi.com`. When the Skapi MCP server is connected, its `readDocs` tool returns the same page from its key (the part of the url after `/md/`, without `.md`) when called with `sdk` set to `py`.

## Documentation Map

<!-- DOCUMENTATION_MAP -->

## Project ID

The app needs the user's Skapi Project ID. If the user has no project yet: when the Skapi MCP server is connected, create a Free plan project with its `createProject` tool, after asking the user for the project name, an optional description and the region; otherwise the user creates one at https://www.skapi.com/new-project and reads the Project ID off the project's Settings page. A pasted `<Project ID>` is this documentation's placeholder, not an id: ask for the real one.

## Installing and Connecting

skapi-py needs Python 3.9 or later and uses only the standard library. Add `skapi` to the project's dependencies, or `skapi[encryption]` when it uses [record encryption](/database/encryption.md#install).

```python
# pip install skapi
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>", storage="~/.myapp/session.json")
```

- One `Skapi` object works with one project and holds one signed-in user. It connects on its first call, not when it is created. Every method is a plain blocking call that returns dicts and lists.
- Without `storage` the session lasts only as long as the object. With a file path the user stays signed in between runs: check `skapi.user is None` before asking them to log in. The file holds the user's tokens: keep it out of version control. See [Login](/authentication/login.md#staying-signed-in-between-runs).
- If the first call fails with `NETWORK_ERROR` and `CERTIFICATE_VERIFY_FAILED` in the message, Python has no trusted certificates (python.org Python on macOS). Do not turn certificate checks off: tell the user to run **Install Certificates.command** from the Python folder in Applications, or to run the program with `SSL_CERT_FILE=/etc/ssl/cert.pem`. See [Getting Started](/introduction/getting-started.md#macos-certificate-verify-failed-on-the-first-call).
- Use one object per thread, and one object per signed-in user, each with its own `storage`. See [Threads](/introduction/getting-started.md#threads).

## Project Settings Made by the Owner

Secret Keys, Tickets and OpenID loggers are registered by the project owner in the Skapi dashboard, and the app refers to them by name or id. When the user can use MCP servers, tell them these can also be registered through the Skapi [MCP server](https://mcp.skapi.com).

### Third-Party APIs (Secret Keys)

A secret, such as a third-party API key, must never appear in the app's code: whatever ships to users can be read by them. See [Forwarding Requests](/api-bridge/forward-request.md#client-secrets).

1. Ask for the Secret Key name and whether the key is **Locked**. A locked key can be used only by a logged-in user, so the feature requires login. An unlocked key can be used by anyone, including signed-out users.
2. Call `skapi.forward_request(options, form)` with `"secretName"` in `options` set to the key name (option keys are spelled as in skapi-js). `form` is an optional dict merged into `data`, or into `params` for `GET`, `DELETE` and `HEAD`.
3. Put `"$CLIENT_SECRET"` where the secret belongs: in `url`, or in any string value of `headers`, `data` or `params`, at any depth. Skapi replaces it with the real value on the server, so the secret never reaches the program. Nothing is filled in inside a `multipart` body. When `"$CLIENT_SECRET"` appears nowhere, skapi-py leaves `secretName` out and sends the request as written.
4. If the key has **Destinations** configured, it can be sent only to those URLs. Tell the user which destination URL the app calls so they can allow it.
5. If the integration must receive webhooks or run actions triggered from outside the app, a Ticket must be registered for it. See [Tickets](/tickets/tickets.md).

### OpenID Login (Google, Facebook, GitHub ...)

1. Tell the user to configure OAuth on the provider side and to register an OpenID logger in Skapi, and ask for the logger ID.
2. The program gets an access token from the provider the way the provider documents it, then `skapi.open_id_login(access_token, "<logger id>")` signs the user in, creating the account on first use. Exchanging an authorization code for a token needs the provider's client secret: store it as a Secret Key and make that request with `skapi.forward_request()`. `ACCOUNT_EXISTS` means a password account has the same login ID; merging it ends its password login for good, so ask the user first. See [OpenID Login](/authentication/openid.md).

## Coding Guidelines

- Methods use Python names (`get_records`, `post_record`), and everything passed to them and returned by them uses the same keys as skapi-js, camelCase ones included (`secretName`, `fetchMore`, `endOfList`). See [Names in Python](/introduction/getting-started.md#names-in-python).
- Record `data` is any JSON value; a `set` or `datetime` raises `INVALID_REQUEST`. Times in answers are milliseconds. See [Creating Records](/database/create.md#data).
- A listing returns a dict with `list` and `endOfList`. For the next page, call again with the same query and `{"fetchMore": True}` until `endOfList` is `True`. Fetch only what you need instead of walking a whole table. Check each method's return shape: a few return a plain list. See [Paging](/database/fetch.md#paging).
- Follow the naming rules for `table`, `index` and `tags`, and give every table query an `access_group`. See [Tables and Access Groups](/database/introduction.md) and [Indexes, Tags and Unique IDs](/database/index-tags.md).
- Files go up as `files=[{"name": ..., "file": ...}]`, where `file` is a path, `bytes` (with a `filename`) or an open file object. Read or save them with `get_file()`: the `url` of a file outside `"public"` works only for a limited time. See [Files](/database/files.md#uploading-with-a-record).
- Record encryption is off by default and needs `Skapi(..., encryption=True)`. A session restored from `storage` stays locked until `unlock_encryption(password)`. The program must show the user their encryption recovery code: a lost password without it means lost data. OpenID users cannot use it. See [Encrypting Private Data](/database/encryption.md#unlocking).

## Command Line Program Rules

- Never write a password, token or Secret Key into the script, its config files or its output. Read credentials from environment variables or ask for them at run time.
- Handle `MFA_REQUIRED` at login by asking for the authenticator code and calling `verify_mfa(code)`, and `SIGNUP_CONFIRMATION_NEEDED` by telling the user to open the confirmation e-mail. See [Handling login errors](/authentication/login.md#handling-login-errors).
- A sign-in made elsewhere, for example on a web page with skapi-js, is taken over with `login_with_token(id_token, access_token, refresh_token)`. The profile is read without checking the signature: make a signed-in call such as `get_profile(refresh_token=True)` before trusting it. See [Signing in with tokens](/authentication/login.md#signing-in-with-tokens).
- Calls that wait, such as `forward_request()` with `poll`, block until the answer is ready: run them in a thread when the program must do other work. The realtime callback runs on a daemon thread, so a program that only listens must keep its main thread alive. See [Connecting to Realtime](/realtime/connecting.md#opening-the-connection).
- skapi-py has only the methods in the [SDK Method Index](#sdk-method-index). Browser features of skapi-js, such as HTML form helpers and registering a device for push notifications, are not in it. When the user asks for something with no method there, tell them it is not in skapi-py instead of working around it with raw HTTP calls.

## SDK Method Index

Every method of `skapi-py`, grouped by its API reference page. The page has each method's signature, parameters and return shape.

<!-- METHOD_INDEX -->
