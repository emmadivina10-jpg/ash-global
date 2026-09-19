# ASH Markets V1

## Scope
- Replace the existing authenticated `/search` Market screen with ASH Markets V1; preserve its route so navigation and existing links remain stable.
- Rename only the mobile navigation label from “Market” to “Markets”. Keep the current five-item navigation layout and interactions unchanged.
- Make no database, authentication, security-policy, payment, wallet, referral, feed, messages, services, profile, property, or notification changes.

## Experience
- Build a focused, mobile-first financial information screen using existing ASH tokens, glass surfaces, buttons, icons, and responsive layout.
- Add the ASH Markets heading, subtitle, “Learn • Discuss • Grow” action, and a visible “Demo Market Data” disclosure.
- Add horizontally scrollable FX, Stocks, Crypto, Indices, and Commodities tabs. FX shows the V1 experience; the others show a polished Coming Soon state.
- Add four equal FX overview cards for EUR/USD, GBP/USD, USD/JPY, and XAU/USD with demo prices, movements, and compact trend lines.
- Add an interactive EUR/USD chart using the chart library already installed. Time-range controls update the displayed demo series and statistics without implying live data.
- Add Analysis, News, Economic Calendar, and Chat tabs:
  - Analysis: neutral educational market observations.
  - News: clearly labeled demo headlines with source, time, category, and open affordance.
  - Economic Calendar: clearly labeled demo events with country, date/time, importance, expected, and previous values.
  - Chat: a safe connection point to the existing Messages screen, explicitly marked Coming Soon for a dedicated market room.
- Add “Learn the Markets” cards for the five requested educational topics.

## Technical details
- Keep V1 market content in a small typed local data module so a licensed provider can replace it later without redesigning the page.
- Reuse `recharts`; add no dependency.
- Use existing semantic color tokens and design components; keep dark/light support and phone/desktop responsiveness.
- Update the page’s route-specific metadata for ASH Markets.

## Verification
- Check the Markets screen at phone and desktop sizes, including horizontal tabs, chart ranges, every content tab, Coming Soon categories, and the Messages connection.
- Confirm the current navigation remains intact apart from the Market → Markets label.
- Check the preview build and confirm untouched areas remain routable.
