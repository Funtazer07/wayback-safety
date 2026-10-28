-- Someone who opens an invite link without an account first saw only the sign-in screen, with no
-- word about who invited them or why (found in the invite test with 3 pairs). The sign-in screen
-- now shows "Anna invited you" first, so get_invite (0005) must also answer before signing in.
--
-- What a signed-out visitor learns: only the inviter's display name and when the link expires,
-- and only with the secret link itself, which works once and for 48 hours. Nothing else about the
-- inviter or the contact. Accepting and declining still need an account (0005).

grant execute on function public.get_invite(text) to anon;
