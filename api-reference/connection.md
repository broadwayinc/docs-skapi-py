# Connection

## Skapi

```python
from skapi import Skapi

skapi = Skapi(project_id: str, *, storage=None, timeout: float = 120, encryption=None)
```

| argument | |
|---|---|
| `project_id` | the Project ID from your project's Settings page on skapi.com |
| `storage` | where the signed-in session is kept: `None` (memory, this object only), a file path (a JSON file created readable by you only), or an object with `get_item(key)`, `set_item(key, value)`, `remove_item(key)` |
| `timeout` | seconds: how long a request may go with nothing moving before it fails. An upload that keeps moving is never cut off; once a file is fully sent, its answer may take 5 × `timeout` |
| `encryption` | `True` or options: encrypts the data of private records before upload. Needs `pip install "skapi[encryption]"`. See [Encryption](/api-reference/encryption#constructor-option). |

Attributes: `project_id`, `service`, `owner`, `version` (`"2.5.0"`), `user` (the signed-in profile or `None`), `session` (tokens: `.id_token.jwt_token`, `.access_token.jwt_token`, `.refresh_token`), `connection` (the last connection info from the server).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Project ID is required.` / `Project ID is invalid.` |
| `NOT_SUPPORTED` | `Record encryption needs the "cryptography" package: pip install "skapi[encryption]"` |
| `NOT_EXISTS` | `The project ID does not exist. Create your project from skapi.com` (raised by the first call) |

## get_connection_info

```python
skapi.get_connection_info(refresh: bool = False) -> dict
```

The project's name and settings, and the caller as the server sees it. `refresh=True` asks the server again instead of using the answer from the first call.

```python
{
    "project_id": "...",
    "service_name": "My Project",
    "user_ip": "203.0.113.7",
    "user_agent": "Python-urllib/3.12",
    "user_location": "KR",
    "version": "2.5.0",
    "conf": {"prevent_signup": False, "require_login": False, "anonymous_login": False, ...},
    "encryption_recovery": {"code": None, "message": "..."},   # only with encryption on and a signed-in user
}
```

`"encryption_recovery"` holds the user's encryption recovery code on the first call after it was created (their first password login with encryption on), and `None` after that, with a `"message"` saying what to do. See [Encryption recovery codes](/database/encryption#encryption-recovery-codes).
