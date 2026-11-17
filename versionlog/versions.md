# Version History

### Current version: 2.4.0

```
pip install --upgrade skapi
```

**2.4.0**

skapi-py 2.4.0 matches skapi-js 2.4.0.

Breaking changes (removed or renamed):

- **Removed: `secure_request()`.** Call your own API with [`forward_request()`](/api-bridge/forward-request) instead: store a key as a client secret on skapi.com, put `"$CLIENT_SECRET"` in a header your API checks, and send `"skapiHeaders": True` to tell your API who is calling. See [Telling the destination who is calling](/api-bridge/forward-request#telling-the-destination-who-is-calling).
- **Removed: `take_recovery_code()`.** The encryption recovery code is now shown once, in [`get_connection_info()`](/api-reference/connection#get-connection-info) as `"encryption_recovery"`: the first call after the code was created returns it in `"code"`, and every later call returns `"code": None` with a `"message"` saying what to do. See [Encryption recovery codes](/database/encryption#encryption-recovery-codes).
- **Renamed: `regenerate_recovery_code()` is now [`regenerate_encryption_recovery_code()`](/api-reference/encryption#regenerate-encryption-recovery-code)**, and it returns `{"encryptionRecoveryCode": ...}` instead of `{"recoveryCode": ...}`.
- **Renamed: `unlock_with_recovery_code()` is now [`unlock_encryption_with_recovery_code()`](/api-reference/encryption#unlock-encryption-with-recovery-code)**, and it returns `{"status", "repaired", "encryptionRecoveryCode"}` instead of `{"status", "repaired", "recoveryCode"}`.
- **Removed: the `minPasswordLength` encryption option.** It is no longer read. Encryption is as strong as the user's password, so ask your users for longer passwords in your own forms.
- **`unlock_encryption()` no longer sets up encryption.** It only opens encryption that was set up at the user's first login with their password. For an account that never did that (for example one only ever restored from saved tokens) it raises `NOT_EXISTS`, so data is never encrypted under a mistyped password. See [Unlocking](/database/encryption#unlocking).

Fixes and changes:

- **Private access keys expire after 1 hour**, and skapi-py gets a new one on its own before the old one runs out. A user who loses access to a private record loses it within the hour.
- **[`delete_files()`](/api-reference/database#delete-files) and `remove_bin` work for any file name**, including names with spaces or non-English characters, and with the `?t=` token URLs of files that are not public. They used to delete nothing for such names. See [Deleting files by URL](/database/files#deleting-files-by-url).
- **The remembered `unique_id`s are cleaned up.** After a record's `unique_id` changed, or the record was deleted (by ID, by `unique_id`, or by a query), the old `unique_id` still pointed at it in this object, so reading or writing by it reached the wrong record.
- **Reading the next page of a read by `reference` no longer starts over at page 1.**
- **Signing out or signing in as someone else clears what the previous user was handed**: private access keys and remembered `unique_id`s.
- **An expired session is kept when the network is down while it is restored.** Signed-in calls raise `NETWORK_ERROR` until the network is back; the session is not signed out.
- **One token refresh at a time.** Threads that need a fresh token at the same moment share one refresh, and `get_profile(refresh_token=True)` right after restoring a session whose saved tokens had expired asks the server once instead of twice.
- **A logout always wins over a token refresh that is still running.** The refresh no longer signs the user back in, and the call that waited for it raises `User login is required.`
- **The profile includes `phone_number_public`** when the account has a phone number. It was always left out.
- **[`forward_request()`](/api-bridge/forward-request) leaves a destination's own `status`, `chunks` or `more` alone.** A finished request whose answer has fields with those names (an API that replies `{"status": "pending"}`, for example) is returned as it is, instead of being polled forever or handed to `on_stream` as streamed text. An `on_stream` callback that raises does not stop the read: a warning is shown and the read goes on.
- **Removing access to an encrypted record re-encrypts its attached files instead of losing them.** Replacing the record's key used to leave the files encrypted under the old key, so nobody could open them, the owner included.
- **[`remove_private_record_access()`](/api-reference/database#remove-private-record-access) on an encrypted record replaces the key first, then removes the access**, so a failure leaves the access as it was. If the write that replaces the key fails, the newly encrypted file copies are deleted again.
- **A key replaced on another device is no longer used.** A grant, an update or `upload_files()` checks the record's key held in this session against the stored record first, so files and data are never encrypted under an old key.
- **An update that does not state the `table` no longer trusts a remembered access group** when it writes data: it reads the record's real group, so a record another device made non-private is not encrypted again.
- **Large encrypted records**: the newest payload file is read (older ones are tried only if it does not open), and the old ones are removed on the next update, also when the record becomes small enough not to need one.
- **Changing the access group of an encrypted record is all or nothing.** If a converted file fails to upload, the copies that did upload are removed, the change is refused, and the record keeps its original files.
- **Two devices logging in for the first time at once** no longer leave a second public key that nobody holds. Unlocking repairs an account left that way: it publishes the user's real public key again and removes the stray one. A user who pinned the stray fingerprint gets `ENCRYPTION_PEER_KEY_CHANGED` and must pin the new one.
- **`lock_encryption()` keeps an encryption recovery code that was not collected yet**: the next `get_connection_info()` still returns it, once. A logout drops it.
- **Reads made by other threads during a grant or a revoke get decrypted data.** They could receive the raw encrypted data.

**2.3.0**

- First release of skapi-py, the Python version of skapi-js 2.3.0.
