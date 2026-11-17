# User Profile

The signed-in user's profile is a dict, available as `skapi.user` and from [`get_profile()`](/authentication/login#the-signed-in-user).

## Updating the profile

[`update_profile()`](/api-reference/authentication#update-profile) changes the signed-in user's own profile and returns the updated profile.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

user = skapi.update_profile({"name": "Ana", "nickname": "ana"})
print(user["name"])  # Ana
```

Pass only the fields you want to change. An empty string `''` clears a field:

```python
skapi.update_profile({"nickname": ""})
```

`email` cannot be cleared. A changed e-mail becomes unverified until the user [verifies](/authentication/email-verification) it.

Keys that are not profile fields are ignored. Anonymous accounts cannot edit their profile.

## Profile fields

Fields the user can set, at [signup](/authentication/signup) or with `update_profile()`:

| field | value |
|---|---|
| `email` | the user's e-mail |
| `name`, `nickname`, `given_name`, `middle_name`, `family_name` | text |
| `gender` | text, for example `"female"` or `"male"` |
| `birthdate` | `"yyyy-mm-dd"` |
| `phone_number` | `"+"` and digits, for example `"+821012345678"` |
| `address` | text, or a dict such as `{"formatted": ..., "locality": ..., "region": ..., "postal_code": ..., "country": ...}` |
| `picture`, `profile`, `website` | a full URL |
| `misc` | any text for your own use; only the user and admins can read it |

Fields set by Skapi, which the user cannot change:

| field | value |
|---|---|
| `user_id` | the user's ID |
| `service`, `owner` | the project and its owner |
| `access_group` | the account's access level, a number |
| `approved` | `"{approver}:{approved or suspended}:{timestamp}"` |
| `locale` | country code where the user signed up |
| `log` | last login time, in seconds |
| `email_verified` | `True` when the e-mail is verified |
| `anonymous` | `True` on [anonymous accounts](/authentication/anonymous), absent otherwise |

## Public fields

`email`, `phone_number`, `address`, `gender` and `birthdate` are private by default. Set the matching `*_public` flag to `True` to let other users see that field when they [search users](/users/search).

```python
skapi.update_profile({"gender": "female", "gender_public": True})
```

The flags are `email_public`, `phone_number_public`, `address_public`, `gender_public` and `birthdate_public`, and must be `True` or `False`. A flag appears in the profile only when its field is set. `email_public: True` needs a verified e-mail, or it raises `INVALID_REQUEST`.

## Disabling an account

A user who leaves your project can disable their own account with [`disable_account()`](/api-reference/authentication#disable-account). They are logged out at once, and all data of the account is deleted after 90 days.

```python
print(skapi.disable_account())  # SUCCESS: account has been disabled.
```

## Recovering a disabled account

Within those 90 days, logging in to a disabled account raises `USER_IS_DISABLED`. Call [`recover_account()`](/api-reference/authentication#recover-account) on the same `Skapi` object to send the user an e-mail with a recovery link. Opening the link reactivates the account.

```python
try:
    skapi.login("user@example.com", "password")
except SkapiError as err:
    if err.code == "USER_IS_DISABLED":
        print(skapi.recover_account())  # SUCCESS: Recovery e-mail has been sent.
    else:
        raise
```

Pass a full URL, `recover_account("https://your.site/welcome-back")`, to have the link lead there after the recovery. The account can only be recovered when its e-mail is verified and the user knows their password.
