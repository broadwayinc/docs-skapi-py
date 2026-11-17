# Encrypting Private Data

skapi-py can encrypt the `data` of private records, and the files attached to them, in your program before they are uploaded. The keys come from the user's password and are never sent to the server. Records and files encrypted by skapi-py open in skapi-js and the other way around.

::: danger A lost password means lost data
**If a user loses their password, their encrypted private data is lost.** Resetting the password gets them back into their account, but it cannot open their encrypted records. Nobody can recover them: not you, and not Skapi.

The **only** way back is the user's [encryption recovery code](#encryption-recovery-codes), and only if they saved it **while they still had access to their account**: the code shown once at their first login with encryption on (in `get_connection_info()["encryption_recovery"]`), or a new one from `regenerate_encryption_recovery_code()`. Once the password is lost, a code can no longer be made.

Before you turn encryption on, make sure your app shows the code to your users and tells them to keep it, and warn them in your password reset flow.
:::

It is off by default, and it covers less than "everything is encrypted". In particular:

- Only `data` and the **contents** of attached files are covered. Index values, tags, file names and the record's other fields stay readable to the server, because queries run on them.
- The strength is capped by the user's password.
- A forgotten password with no saved [encryption recovery code](#encryption-recovery-codes) means the data is gone.

## Install

Encryption needs the `cryptography` package:

```bash
pip install "skapi[encryption]"
```

Without it, `Skapi(..., encryption=True)` raises `NOT_SUPPORTED` with that install line.

## What the server sees

| Readable by the server | Encrypted |
|---|---|
| `record_id`, `unique_id`, `table`, `access_group` | `data` of private records |
| `index`, `tags`, `reference` | contents of files on private records |
| file names, sizes, upload times | |
| timestamps, record sizes | |
| the users a record is shared with | |

Records outside the `"private"` group are never encrypted.

## The security claim, exactly

**For a user's own private records, not shared:**

> A service provider who dumps the database, the storage bucket, and every request log cannot recover the record's `data` without a successful offline guess against the user's password.

**For records shared with other users:**

> The provider cannot recover the record's `data` by reading its own database. It *can* obtain that record's data key by serving a forged public key at the moment the user shares, which the user can detect by comparing key fingerprints, and which `trustPolicy: "strict"` prevents outright.

Both are bounded by the password. The key is derived with PBKDF2 (600,000 rounds), so a short password falls to an offline attack. Encryption works with any valid account password, so it is exactly as strong as the password the user chose. **When you use client-side encryption, encourage your users to use longer passwords**, for example with a hint in your signup and password-change forms.

## Turning it on

::: warning Users who log in with OpenID cannot use encryption
An OpenID user ([open_id_login](/api-reference/authentication#open-id-login)) never sets a password: their account password is created by Skapi, so a key made from it would not protect anything from the provider. Their encryption stays locked (`OPENID_UNSUPPORTED`): they **cannot save records with `"access_group": "private"`** (`ENCRYPTION_LOCKED`), and encrypted records shared with them read as `None`. Their other records work as usual.
:::

```python
from skapi import Skapi

skapi = Skapi("<Project ID>", encryption=True)
```

With options:

```python
skapi = Skapi("<Project ID>", encryption={
    "iterations": 600000,       # PBKDF2 rounds. Default 600000, minimum 100000.
    "recovery": "code",         # issue an encryption recovery code. "code" (default) or "none".
    "trustPolicy": "tofu",      # "tofu" (default) or "strict". See Sharing.
    "withheld": "null",         # "null" (default) or "sentinel". See below.
})
```

The option only applies to the object it is given to. An object made without it saves every record in the clear, and turning it on later does not encrypt what was already saved.

Then use records as usual:

```python
skapi.login("user@example.com", "password")

skapi.post_record({"diagnosis": "confidential"}, {"table": {"name": "notes", "access_group": "private"}})

rec = skapi.get_records({"table": {"name": "notes", "access_group": "private"}})["list"][0]
rec["data"]        # {"diagnosis": "confidential"}
rec["encrypted"]   # {"status": "encrypted", "recipients": ["<your user id>"]}
```

## Unlocking

Signing in with a password ([login](/authentication/login), [signup](/authentication/signup) with `login`, or [verify_mfa](/authentication/mfa)) unlocks encryption. The first time, it also sets up the user's keyring: a random master key wrapped under the password, and a key pair for sharing. If two devices set it up for the same user at the same moment, the first keyring kept wins: the other device uses it and removes its own keyring and public key. An account left with a stray public key on top (by an older SDK, or a removal that failed) is repaired when it unlocks: the user's real public key is published again and the stray one is removed. A user who pinned the stray fingerprint gets `ENCRYPTION_PEER_KEY_CHANGED` and must pin the new one.

A session that did not sign in with a password stays locked: one restored from `storage`, or from [login_with_token](/api-reference/authentication#login-with-token). skapi-py never saves the master key. Unlock it with the password:

```python
skapi.get_encryption_status()
# {"status": "locked", "reason": "NO_SESSION_KEY", ...}

skapi.unlock_encryption("password")
# {"status": "unlocked"}
```

`unlock_encryption()` only opens encryption that is already set up. It is set up at the first login with the password, so an account that has never logged in with its password gets `NOT_EXISTS`.

While locked, private records read as `data: None` with `encrypted: {"status": "failed", "reason": "NO_SESSION_KEY"}`, and writing one raises `ENCRYPTION_LOCKED`. [lock_encryption](/api-reference/encryption#lock-encryption) and [logout](/api-reference/authentication#logout) forget the keys. A lock keeps an encryption recovery code that was not collected yet, so the next `get_connection_info()` still returns it, once; a logout drops it.

## Reading what you cannot decrypt

A private record that cannot be decrypted comes back with `data: None` and a reason:

| reason | |
|---|---|
| `NO_SESSION_KEY` | encryption is locked |
| `NOT_A_RECIPIENT` | the record was not shared with you; `encrypted["recipients"]` lists who it was |
| `ENCRYPTION_DISABLED` | this `Skapi` object was made without `encryption` |
| `BAD_KEY` / `CORRUPT` / `BINDING_MISMATCH` | the stored key or data does not open |
| `DATA_UNAVAILABLE` | the stored data could not be downloaded |
| `UNSUPPORTED_VERSION` | made by a newer SDK |

With `"withheld": "sentinel"`, `data` is `{"__skapi_no_access__": True, "reason": ...}` instead of `None`; [is_withheld](/api-reference/encryption#is-withheld) tells it apart. Writing such a value back raises `ENCRYPTION_CANNOT_REWRITE_WITHHELD`.

## Changing a password

[change_password](/authentication/password) adds a wrap under the new password **before** the password changes. Encryption must be unlocked, or it raises `ENCRYPTION_LOCKED` and the password stays as it was.

A **reset** ([forgot_password](/api-reference/authentication#forgot-password) and [reset_password](/api-reference/authentication#reset-password)) proves the e-mail address, not the old password, so it cannot open the keyring. After a reset, the user's encrypted data opens only with their encryption recovery code.

## Encryption recovery codes

**When a user forgets their password and resets it, they lose access to their encrypted private records, unless they saved their encryption recovery code.** The code is the only way back. It is not the code `forgot_password()` e-mails: that one resets the account password, this one unlocks the encrypted data.

There are two ways to get one, and both work only while the user still has access:

1. **Shown once, at setup.** The first password login with encryption on creates the code. The next [get_connection_info](/api-reference/connection#get-connection-info) returns it in `"encryption_recovery"`, one time only:

```python
skapi.login("user@example.com", "password")
info = skapi.get_connection_info()["encryption_recovery"]
# first time: {"code": "XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX",
#              "message": "This is your encryption recovery code. Save it now: it is shown only this once. ..."}
# after that: {"code": None,
#              "message": "Your encryption recovery code was shown once and cannot be shown again. Call regenerate_encryption_recovery_code() to get a new one."}
```

2. **A new one, any time, with [regenerate_encryption_recovery_code](/api-reference/encryption#regenerate-encryption-recovery-code).** It needs the user signed in and unlocked, and the old code stops working.

After a password reset, sign in with the new password and unlock with the saved code, giving the new password so every later login unlocks normally. This is needed once:

```python
skapi.login("user@example.com", "new password")   # encryption stays locked: the keyring is sealed under the old password
res = skapi.unlock_encryption_with_recovery_code("XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX", "new password")
# {"status": "unlocked", "repaired": True, "encryptionRecoveryCode": "<a new code>"}
```

Using a code replaces it: save the new one. With `"recovery": "none"` no code is ever made.

## Sharing a record

The owner shares an encrypted record with the usual [grant](/database/private#granting-access):

```python
skapi.grant_private_record_access({"record_id": rec["record_id"], "user_id": "<user id>"})
```

skapi-py fetches the other user's public key, wraps the record's key to it and writes that onto the record, then grants access. The other user reads the record with their own session; the owner does not need to be online.

Removing access also replaces the record's key and re-encrypts its data and its encrypted files, so the removed user cannot read later versions. It cannot take back what they already read. The files are encrypted under the new key and uploaded first, then one write puts the new key on the record and deletes the old copies, and only then is the access removed. If any step fails, the new copies are deleted and the record, its files and its access stay as they were.

- Only the owner can share or remove access on an encrypted record.
- The owner can do this from any device. Before sharing, removing access, updating or attaching files, skapi-py checks that the record's key it holds is still the one on the record, and reads the record again when another session changed it.
- An update that does not state the `table` reads the record's access group before it writes `data`, so a record another device made non-private is not encrypted again.
- The other user must have signed in once with encryption on, so that they have a key. Otherwise the grant raises `ENCRYPTION_RECIPIENT_HAS_NO_KEY` and changes nothing.
- The first key seen for a user is remembered (pinned). If it later changes, sharing with them raises `ENCRYPTION_PEER_KEY_CHANGED`: confirm the new fingerprint with that user, then [pin_peer_key](/api-reference/encryption#pin-peer-key).
- With `"trustPolicy": "strict"`, no key is trusted until you pin it, which closes the forged-key risk in [the claim](#the-security-claim-exactly). Users compare fingerprints out of band: `get_encryption_status()["fingerprint"]`.

## Changing the access group

Moving a record out of `"private"` writes its data back in the clear, and its encrypted files are uploaded again in the clear. Moving it into `"private"` encrypts the data, and the files already on it are encrypted as well. Either way, every grant on the record is removed, as for any private record.

## Files

Files uploaded to an encrypted private record are encrypted too. [get_file](/database/files#downloading-files) decrypts them; read the record first in the session, so its key is known. In the record's `bin` they are marked `"encrypted": True`, with the plaintext `size` and the stored size in `stored_size`. A file link from `get_file(..., {"dataType": "endpoint"})` downloads the encrypted bytes.

## Limits

- **Size.** Encryption adds about a third, so a single record holds about 1.5 MB of data instead of 2 MB; more raises `ENCRYPTED_DATA_TOO_LARGE`. An update over 256 KB once encrypted is stored as a file next to the record; [post_records](/api-reference/database#post-records) refuses such updates, save them with `post_record`. A record holding more than one such file (left by older SDKs) is read from the newest, and the extra files are removed on its next update.
- **Whole updates only.** `data` is one sealed value, so changing one field means read, change, write. Updating a record without `data` (only its index, tags, and so on) is fine.
- **OpenID accounts cannot use encryption.** Their password comes from Skapi, so encryption would protect nothing against the provider. Their encryption stays locked (`OPENID_UNSUPPORTED`): they cannot save private records (`ENCRYPTION_LOCKED`), and encrypted records shared with them read as `None`.
- **Reserved names.** `__skapi_enc__` in record data, `__skenc__` in a file field name, and the table `__skapi__keyring` (where each user's keyring lives).
- **One project.** Encrypted records cannot be written to another project through `service`/`owner`; use a separate `Skapi` object.
- **Server-side reads.** Nothing on the server can read encrypted data: no search on it, and the project owner sees `data` withheld.
