# Encryption

Needs `Skapi(..., encryption=True)` and `pip install "skapi[encryption]"`. See [Encrypting Private Data](/database/encryption). Every method raises [`SkapiError`](/introduction/errors).

## Constructor option

```python
Skapi(project_id, encryption=True | dict)
```

| key | default | |
|---|---|---|
| `iterations` | `600000` | PBKDF2 rounds for new password wraps; at least `100000` |
| `recovery` | `"code"` | `"none"`: no encryption recovery codes |
| `trustPolicy` | `"tofu"` | `"strict"`: only pinned keys are used for sharing |
| `withheld` | `"null"` | `"sentinel"`: undecryptable `data` is `{"__skapi_no_access__": True, "reason": ...}` |
| `table` | `"__skapi__keyring"` | the table that holds keyrings |

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"options.encryption" should be a boolean or an object.` |
| `INVALID_PARAMETER` | `"encryption.iterations" must be at least 100000.` |
| `NOT_SUPPORTED` | `Record encryption needs the "cryptography" package: pip install "skapi[encryption]"` |

## get_encryption_status

```python
skapi.get_encryption_status() -> dict
```

```python
{"status": "disabled"}
{"status": "locked", "reason": "NO_SESSION_KEY" | "OPENID_UNSUPPORTED", "user_id"?: ..., "fingerprint"?: ...}
{"status": "unlocked", "user_id": "...", "fingerprint": "..."}
```

`fingerprint` is the user's own public key fingerprint, for others to pin.

## unlock_encryption

```python
skapi.unlock_encryption(password: str) -> dict
```

Opens the keyring with the password. Returns `{"status": "unlocked"}`. It never sets encryption up: that happens at the first login with the password, so an account that has never logged in with its password gets `NOT_EXISTS`.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Encryption is not enabled for this instance.` |
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `"password" is required.` |
| `NOT_EXISTS` | `Encryption has not been set up for this account yet. It is set up at the first login with the password: log in with the password to start using it.` |
| `ENCRYPTION_BAD_PASSWORD` | `Incorrect password: the encryption keyring could not be opened.` |
| `ENCRYPTION_KEYRING_CORRUPT` | `The encryption keyring does not belong to this user.` / `The keyring has no password wrap.` |
| `ENCRYPTION_LOCKED` | `Encryption could not be unlocked: <reason>` |

## lock_encryption

```python
skapi.lock_encryption() -> dict
```

Forgets the keys. `{"status": "locked"}`, or `{"status": "disabled"}`. An encryption recovery code not collected yet is kept: the next `get_connection_info()` still returns it, once.

## is_withheld

```python
skapi.is_withheld(value) -> bool
```

`True` for the `"sentinel"` placeholder of undecryptable data.

## Encryption recovery code

Shown once, in [get_connection_info](/api-reference/connection#get-connection-info) as `"encryption_recovery"`, after the first password login with encryption on. See [Encryption recovery codes](/database/encryption#encryption-recovery-codes).

## unlock_encryption_with_recovery_code

```python
skapi.unlock_encryption_with_recovery_code(code: str, password: str | None = None) -> dict
```

Unlocks encryption with the saved encryption recovery code, for a user signed in after a password reset. With `password`, the keyring opens with that password from now on. The code is replaced by a new one.

```python
{"status": "unlocked", "repaired": bool, "encryptionRecoveryCode": "<new code>" | None}
```

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required. Reset the password and log in first, then use the encryption recovery code.` |
| `INVALID_PARAMETER` | `"code" is required.` |
| `NOT_EXISTS` | `This account has no encryption keyring, so there is nothing to recover.` |
| `ENCRYPTION_BAD_RECOVERY_CODE` | `That does not look like an encryption recovery code: expected 28 characters, got <n>.` / `... "<c>" is not a valid character.` / `That encryption recovery code has a typo in it: the check characters do not match.` / `That encryption recovery code did not open the keyring. ...` |

## regenerate_encryption_recovery_code

```python
skapi.regenerate_encryption_recovery_code() -> dict
```

A new encryption recovery code, `{"encryptionRecoveryCode": "..."}`; the old one stops working. Needs encryption unlocked.

| code | message |
|---|---|
| `ENCRYPTION_LOCKED` | `Encryption must be unlocked to issue an encryption recovery code. ...` |
| `INVALID_REQUEST` | `Encryption recovery codes are turned off for this instance ("encryption.recovery" is "none").` |

## pin_peer_key

```python
skapi.pin_peer_key(user_id: str, fingerprint: str) -> None
```

Trusts `fingerprint` as `user_id`'s key for sharing, saved in the keyring. Raises `ENCRYPTION_LOCKED` (`Encryption is locked.`) when not unlocked.

## Errors from other methods

With encryption on, these can come from [post_record](/api-reference/database#post-record), [post_records](/api-reference/database#post-records), [get_file](/api-reference/database#get-file), [grant_private_record_access](/api-reference/database#grant-private-record-access), [remove_private_record_access](/api-reference/database#remove-private-record-access) and [change_password](/api-reference/authentication#change-password):

| code | when |
|---|---|
| `ENCRYPTION_LOCKED` | writing a private record, changing the password, or opening an encrypted file while locked |
| `ENCRYPTION_NOT_RECORD_OWNER` | writing another user's encrypted record |
| `ENCRYPTION_CANNOT_REWRITE_WITHHELD` | writing back a withheld placeholder |
| `ENCRYPTED_DATA_TOO_LARGE` | the encrypted data is over 2 MB |
| `ENCRYPTION_GRANT_REQUIRES_OWNER` | sharing or removing access on a record you do not own |
| `ENCRYPTION_RECIPIENT_HAS_NO_KEY` | the user never signed in with encryption on |
| `ENCRYPTION_PEER_KEY_CHANGED` / `ENCRYPTION_PEER_NOT_PINNED` | see [Sharing](/database/encryption#sharing-a-record) |
| `ENCRYPTION_DATA_UNAVAILABLE` | the record's data could not be read while changing its sharing |
| `ENCRYPTION_FILE_CORRUPT` / `ENCRYPTION_FILE_STALE_KEY` | an encrypted file does not open with the record's key |
| `INVALID_PARAMETER` | `"__skapi_enc__" is a reserved key in record data.` / `"__skenc__" is reserved in an upload form key.` |
