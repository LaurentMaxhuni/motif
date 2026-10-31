# Holo authenticated research

Date: 2026-10-31.

The user authorized a disposable-email signup to inspect the service more deeply. One mailbox was created using [Mail.tm](https://mail.tm/). Credentials and the disposable browser profile are excluded from Git under `output/holo-research/`.

## Observed flow

1. Opened `https://app.tryholo.ai/login` in an isolated Chrome profile.
2. Entered the temporary email and clicked **Get Confirmation Code**.
3. Holo displayed six separate code inputs and reported that a verification code had been sent. Resend initially had a 119-second cooldown; the page advised allowing up to five minutes for delivery.
4. A verification email arrived from `support@tryholo.ai`. Its one-time code was entered without printing it or storing it in committed files.
5. Successful authentication redirected to `https://app.tryholo.ai/no-subscription`.
6. At a 1920 × 1080 desktop viewport, the authenticated page showed **No Active Subscription**, the logged-in address, **Sign out**, **Check Subscription**, and a **Get subscription** link to the public pricing page.
7. Public plan selection led to checkout with progress **Plan → Payment → Launch**. The observed Starter biannual checkout showed $122 due today. Payment methods were not selected and no payment details were entered.

At the default 1280 × 720 REA viewport the app displayed a desktop/zoom warning that obscured the subscription message. Increasing the viewport revealed the actual gate. This was a rendering correction, not an authentication or subscription workaround.

## Evidence

- Login code request: `ev_2c4428226fc8fce14a5fa74d0e7dc1babdf3789d4013673b311024135da839fd`.
- Authenticated desktop subscription gate: `ev_4011aa9169f3557df8db9e3ae626e87f0379e5054c17b94d7d8f781ea987ff33`.
- Public plan-to-checkout navigation: `ev_82ffcbb23bd8156775d0f2d3966abe3c152cca184e1e55ab6f5268b375dfeb31`.

Selected, redacted REA projections are in [rea-authenticated-research.json](rea-authenticated-research.json). OTP submission used the browser automation helper, while REA captured the login request, resulting authenticated gate, and public checkout navigation. These observations do not establish the implementation of Holo’s paid studio.

## Implication for Motif

Temporary-email authentication does not provide access to brand onboarding, generation, or the editor without a subscription. Those workflows remain reconstructed from public product descriptions. Motif deliberately omits Holo’s payment and subscription gates and runs without an account.

No subscription was purchased, no paid API was invoked, and no access control was bypassed. A subscribed session would be needed for direct verification of the paid product.
