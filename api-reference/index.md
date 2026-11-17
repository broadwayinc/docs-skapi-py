# API Reference

Every method of skapi-py 2.4.0. Each one raises [`SkapiError`](/introduction/errors) on failure.

## [Connection](/api-reference/connection)

| method | |
|---|---|
| [`Skapi(project_id, *, storage=None, timeout=120, encryption=None)`](/api-reference/connection#skapi) | connects to one project |
| [`get_connection_info(refresh=False)`](/api-reference/connection#get-connection-info) | project name and settings |

## [Authentication](/api-reference/authentication)

| method | |
|---|---|
| [`signup(params, option=None)`](/api-reference/authentication#signup) | creates an account |
| [`resend_signup_confirmation()`](/api-reference/authentication#resend-signup-confirmation) | sends the confirmation e-mail again |
| [`login(email, password, username=None)`](/api-reference/authentication#login) | signs in |
| [`verify_mfa(code)`](/api-reference/authentication#verify-mfa) | finishes a login that needs an authenticator code |
| [`logout(global_logout=False)`](/api-reference/authentication#logout) | signs out |
| [`get_profile(refresh_token=False)`](/api-reference/authentication#get-profile) | the signed-in user's profile |
| [`login_with_token(id_token, access_token, refresh_token)`](/api-reference/authentication#login-with-token) | adopts tokens from another sign-in |
| [`update_profile(params)`](/api-reference/authentication#update-profile) | changes the user's profile |
| [`change_password(current_password, new_password)`](/api-reference/authentication#change-password) | changes the password |
| [`forgot_password(email)`](/api-reference/authentication#forgot-password) | sends a password reset code |
| [`reset_password(email, code, new_password)`](/api-reference/authentication#reset-password) | sets a new password with the code |
| [`verify_email(code=None)`](/api-reference/authentication#verify-email) | sends or checks an e-mail verification code |
| [`last_verified_email(revert=None)`](/api-reference/authentication#last-verified-email) | the last verified e-mail |
| [`disable_account()`](/api-reference/authentication#disable-account) | disables the user's own account |
| [`recover_account(redirect=False)`](/api-reference/authentication#recover-account) | sends the recovery e-mail to a disabled account |
| [`open_id_login(token, id)`](/api-reference/authentication#open-id-login) | signs in through an OpenID provider |
| [`anonymous_login()`](/api-reference/authentication#anonymous-login) | a temporary account without e-mail or password |
| [`verify_anonymous_session()`](/api-reference/authentication#verify-anonymous-session) | checks a restored temporary account still exists |
| [`setup_mfa()`](/api-reference/authentication#setup-mfa) / [`enable_mfa(code)`](/api-reference/authentication#enable-mfa) / [`disable_mfa()`](/api-reference/authentication#disable-mfa) / [`get_mfa_status()`](/api-reference/authentication#get-mfa-status) | two-step login with an authenticator app |

## [Database](/api-reference/database)

| method | |
|---|---|
| [`post_record(data, config, files=None)`](/api-reference/database#post-record) | creates or updates a record |
| [`post_records(items)`](/api-reference/database#post-records) | many records in few requests |
| [`get_records(query, fetch_options=None)`](/api-reference/database#get-records) | reads records |
| [`delete_records(query)`](/api-reference/database#delete-records) | deletes records |
| [`get_tables`](/api-reference/database#get-tables) / [`get_tags`](/api-reference/database#get-tags) / [`get_indexes`](/api-reference/database#get-indexes) / [`get_unique_id`](/api-reference/database#get-unique-id) | what the database holds |
| [`upload_files(files, record_id)`](/api-reference/database#upload-files) | attaches files to a record |
| [`get_file(url, config=None)`](/api-reference/database#get-file) | downloads a file, or makes a link to it |
| [`delete_files(endpoints)`](/api-reference/database#delete-files) | removes files from records |
| [`grant_private_record_access`](/api-reference/database#grant-private-record-access) / [`remove_private_record_access`](/api-reference/database#remove-private-record-access) / [`list_private_record_access`](/api-reference/database#list-private-record-access) / [`request_private_record_access_key`](/api-reference/database#request-private-record-access-key) | sharing private records |

## [Encryption](/api-reference/encryption)

| method | |
|---|---|
| [`get_encryption_status()`](/api-reference/encryption#get-encryption-status) | locked, unlocked or disabled |
| [`unlock_encryption(password)`](/api-reference/encryption#unlock-encryption) / [`lock_encryption()`](/api-reference/encryption#lock-encryption) | opens or forgets the user's keys |
| [`unlock_encryption_with_recovery_code(code, password=None)`](/api-reference/encryption#unlock-encryption-with-recovery-code) / [`regenerate_encryption_recovery_code()`](/api-reference/encryption#regenerate-encryption-recovery-code) | encryption recovery codes (the first one is shown once in `get_connection_info()`) |
| [`pin_peer_key(user_id, fingerprint)`](/api-reference/encryption#pin-peer-key) | trusts another user's key for sharing |
| [`is_withheld(value)`](/api-reference/encryption#is-withheld) | tells the placeholder of undecryptable data apart |

## [Users](/api-reference/users)

| method | |
|---|---|
| [`get_users(params=None, fetch_options=None)`](/api-reference/users#get-users) | searches the project's users |
| [`subscribe(params)`](/api-reference/users#subscribe) / [`unsubscribe(params)`](/api-reference/users#unsubscribe) | subscribes to another user |
| [`block_subscriber(params)`](/api-reference/users#block-subscriber) / [`unblock_subscriber(params)`](/api-reference/users#unblock-subscriber) | blocks a subscriber |
| [`get_subscriptions(params)`](/api-reference/users#get-subscriptions) | who subscribes to whom |
| [`get_feed(params=None)`](/api-reference/users#get-feed) | records from the users you subscribe to |
| [`subscribe_newsletter(params)`](/api-reference/users#subscribe-newsletter) / [`unsubscribe_newsletter(group)`](/api-reference/users#unsubscribe-newsletter) | newsletter subscription |
| [`get_newsletters(params=None)`](/api-reference/users#get-newsletters) / [`get_newsletter_subscription()`](/api-reference/users#get-newsletter-subscription) | sent newsletters and the user's subscriptions |
| [`send_inquiry(data)`](/api-reference/users#send-inquiry) | sends a message to the project owner |

## [Realtime](/api-reference/realtime)

| method | |
|---|---|
| [`connect_realtime(callback)`](/api-reference/realtime#connect-realtime) / [`close_realtime()`](/api-reference/realtime#close-realtime) | opens or closes the realtime connection |
| [`join_realtime(group)`](/api-reference/realtime#join-realtime) | joins or leaves a group |
| [`post_realtime(message, recipient, notification=None)`](/api-reference/realtime#post-realtime) | sends to a user or to the group |
| [`get_realtime_groups(params=None)`](/api-reference/realtime#get-realtime-groups) / [`get_realtime_users(params=None)`](/api-reference/realtime#get-realtime-users) | who is connected where |

## [API Bridge](/api-reference/api-bridge)

| method | |
|---|---|
| [`forward_request(options, form=None, on_stream=None)`](/api-reference/api-bridge#forward-request) | calls another API through Skapi, with your client secrets |
| [`forward_request_poll(request_id)`](/api-reference/api-bridge#forward-request-poll) / [`forward_request_stream(request_id)`](/api-reference/api-bridge#forward-request-stream) | waits for a queued or streamed answer |
| [`forward_request_finalize(request_id, data)`](/api-reference/api-bridge#forward-request-finalize) | stores a streamed request's final answer |
| [`forward_request_history(params)`](/api-reference/api-bridge#forward-request-history) | past forwarded requests and their answers |
| [`cancel_forward_request(params)`](/api-reference/api-bridge#cancel-forward-request) / [`forward_request_queue_count(params)`](/api-reference/api-bridge#forward-request-queue-count) | queue control |

## [Tickets](/api-reference/tickets)

| method | |
|---|---|
| [`consume_ticket(ticket_id, method, data, auth)`](/api-reference/tickets#consume-ticket) | calls a ticket |
| [`get_tickets(params=None)`](/api-reference/tickets#get-tickets) | the project's tickets |
| [`get_consumed_tickets(params=None)`](/api-reference/tickets#get-consumed-tickets) | the user's own ticket calls |
