# YOFLIX demo

A static HTML / CSS / JS copy of the complete YOFLIX website frontend.

## Open it

- **On your computer:** double-click `index.html`. Every page, link, image, style and script works straight from the folder
  (fonts and icons load from Google Fonts / cdnjs, so be online for the exact look).
- **On Netlify:** go to https://app.netlify.com/drop, sign in and drag this whole `yoflix-demo` folder onto the page.
  Send the client the link Netlify gives you. Rename it under **Site configuration → Change site name**;
  update it later under **Deploys** by dragging the folder in again.

## Pages

- `index.html`
- `about/index.html`
- `services/index.html`
- `ebay-business-plans/index.html`
- `contact/index.html`
- `services/shopify-support/index.html`
- `services/walmart-support/index.html`
- `services/ebay-account-creation/index.html`
- `services/ebay-account-management/index.html`
- `services/virtual-assistant-services/index.html`
- `services/product-hunting-&-listing/index.html`
- `services/customer-support/index.html`
- `services/store-operations/index.html`
- `faqs/index.html`
- `privacy-policy/index.html`
- `thank-you/index.html` (after the contact form is sent) and `404.html` (Netlify's not-found page)

## What works

- Every page, menu (including the phone menu), service tab, FAQ, hover effect, animation and the world map.
- **Contact form** on Netlify: sent through Netlify Forms. Submissions appear in Netlify → your site → **Forms**
  (turn on email alerts under **Forms → Form notifications**). Choosing a plan still fills in the subject.
  Opened from your computer the form cannot send (there is no server); it works once on Netlify.
- Call, WhatsApp, email and Google Maps links.

## Not included

- The AI chat assistant (it needs the real website's server).
- The admin / CMS: this is a read-only copy. Change content on the real website, then export again:
  `php demos/export-static.php . demos/yoflix-demo` from the project folder (delete the old folder first).
