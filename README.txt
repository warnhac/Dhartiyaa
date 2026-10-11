DHARTIYA NATURAL FOODS - ENQUIRY WEBSITE

HOW TO RUN
1. Keep index.html, styles.css, script.js and the assets folder together.
2. Double-click index.html. No installation or server is needed.

HOW ENQUIRIES WORK
- Every product has an "Enquire now" button. It opens WhatsApp with the product, pack size (1 kg / 5 kg) and price already typed in. The visitor presses Send.
- The contact form sends its details to WhatsApp the same way.
- A floating "Chat on WhatsApp" button appears on every page.
- Products can also be added to a cart (Add to cart). The cart total includes the offer; "Send order on WhatsApp" opens WhatsApp with the full order, delivery details and subtotal. The cart is remembered in the visitor's browser. There is no online payment.

BEFORE GOING LIVE
- Set your WhatsApp number at the top of script.js: const WHATSAPP_NUMBER = '910000000000'; (country code + number, digits only, no + or spaces). The current value is a PLACEHOLDER.
- Prices in index.html are SAMPLE prices: edit data-price (1 kg) and data-price-5 (5 kg, only on Whole Wheat, Sharbati and Multigrain) on each product card. 5 kg prices are also samples.
- Limited-time offer: change percent or end date at the top of script.js (const OFFER). It switches off automatically after the end time.
- Verify product claims, nutrition details and packaging before commercial use.
- Needed images in assets/: whole-wheat.jpg, sharbati.jpg, multigrain.jpg, black-chana.jpg, jowar.jpg, makka.jpg, ragi.jpg, all-products.jpg (logo is built into index.html).
- WhatsApp opens with a pre-filled message; the visitor must press Send. Without a server or the WhatsApp Business API, messages cannot arrive automatically.

ACCOUNTS (LOGIN / SIGN UP)
- "Log in" in the header opens a window with Log in and Sign up tabs. Guests can still order without an account.
- Accounts are stored in this browser's localStorage only; passwords are salted and hashed (PBKDF2) but this is NOT secure server-side authentication.
- No password reset and no sync between devices/browsers. Clearing browser data deletes accounts.
- Logged-in customers get name, phone and last-used address pre-filled at checkout, and their account email appears in the WhatsApp order.
- For a real shop, use a server-side auth service (e.g. Firebase Auth, Supabase, Auth0).

DELIVERY PIN CODE CHECK
- Checkout asks for a 6-digit PIN code. Only Delhi PIN codes (110001 - 110097) are accepted; for any other PIN a popup says "Sorry, we are not delivering at this PIN code" and the order is not sent.
- To change the delivery area, edit DELHI_PIN_MIN / DELHI_PIN_MAX in script.js. The range check cannot know which numbers inside the range are actually unassigned.
