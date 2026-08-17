UPDATE auth.users
SET confirmation_token = '', recovery_token = '', email_change = '',
    email_change_token_new = '', email_change_token_current = '',
    phone_change = '', phone_change_token = '', reauthentication_token = ''
WHERE lower(email) = 'playreview@doseroutine.com';