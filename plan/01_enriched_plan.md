# Enriched Plan

## The Core Thesis

Caregiving is the most important work people do, and it's almost entirely unsupported by software. The tools that exist (group texts, shared calendars, scattered apps) weren't designed for care — they were designed for productivity or socializing. Care is neither. It's a sustained, emotional, collaborative responsibility that evolves constantly.

This app exists to make the invisible labor of caregiving visible, shared, and manageable.

---

## Use Cases (Expanded)

### Tier 1 — Launch Cases (strongest product-market fit)

**1. Aging Parent Care**
The flagship case. One sibling carries the load. Others want to help but don't know how or feel guilty about not doing more. The system creates a shared care plan, distributes tasks based on proximity and availability, keeps everyone informed without burdening the primary caregiver, and gives the care recipient dignity and agency.

Key scenarios:
- Coordinating doctor appointments, capturing what the doctor said, sharing notes with siblings
- Medication tracking with verification (did Mom take her evening pills?)
- Grocery runs, meal prep, house maintenance
- Managing professional caregivers (home health aides) alongside family
- Financial coordination (who paid for what, tracking expenses)
- The "how's Dad doing?" problem — automatic summaries so the distant sibling stays informed without the local sibling having to repeat everything
- Emergency info card: medications, allergies, doctors, insurance, power of attorney contacts

**2. Co-Parenting / Kid Management**
The second strongest case. Not just divorced co-parents (though that's huge) — any household where kid logistics are complex.

Key scenarios:
- School, sports, activities calendar aggregation (pull from email, apps, group chats)
- "What does MY kid need to do?" filtering from noisy group communications
- Pickup/dropoff coordination between parents, friends, family
- Chore and homework tracking where the kid can participate
- Babysitter/nanny handoff notes
- Coordinating with other parents (carpooling, playdates, team snacks schedule)

**3. Pet Care**
Simpler than human care but still a daily coordination problem. Great onboarding case because it's low-stakes and teaches the app's patterns.

Key scenarios:
- Feeding schedule with confirmation (did you feed the dog?)
- Medication timing with safety rails (prevent double-dosing)
- Vet appointments, vaccination records
- Dog walker / pet sitter coordination
- Behavioral notes (he's been limping, watch for it)

### Tier 2 — Near-Term Expansion

**4. Post-Surgery / Recovery Plans**
Someone has knee surgery. The PT gives a recovery plan. The spouse needs to help with logistics for 6 weeks. This is a bounded, high-intensity caregiving period.

Key scenarios:
- Structured recovery plan with daily exercises, medication schedule
- Progress tracking (range of motion, pain levels)
- PT appointment prep and follow-up notes
- Gradual independence (week 1: they need rides everywhere; week 4: they're driving again)

**5. Chronic Illness Management**
Diabetes, autoimmune conditions, mental health. Ongoing care that requires daily attention and often involves a support person.

Key scenarios:
- Daily tracking (blood sugar, symptoms, mood)
- Medication management with reminders and logging
- Appointment coordination
- Pattern recognition (AI notices blood sugar spikes on weekends, suggests investigating)

**6. Newborn / Infant Care**
First-time parents are overwhelmed. Two parents trying to coordinate feeding, sleep, diaper changes, pediatrician visits.

Key scenarios:
- Feeding log (who fed, when, how much)
- Sleep tracking
- Milestone tracking
- Pediatrician visit prep (questions to ask) and notes

### Tier 3 — Future / Premium

**7. Professional Caregiving (B2B)**
Personal trainers, nutritionists, life coaches, therapists who build plans for clients. This is your Case 5 — it's real but it's a different business motion (B2B vs B2C).

**8. Care Facility Coordination**
Families coordinating with assisted living facilities, nursing homes, hospice.

**9. Special Needs Care**
Children or adults with special needs requiring complex, multi-provider care coordination (therapists, schools, doctors, family).

---

## What You're Not Thinking About

### 1. The Emotional Layer
Caregiver burnout is the #1 risk. The app shouldn't just manage tasks — it should care for the caregivers.
- Check-ins: "You've completed 14 tasks this week. How are you feeling?"
- Load visibility: Show all members how effort is distributed (without being accusatory)
- Praise and gratitude: Let family members send appreciation. "Thanks for taking Mom to her appointment" should be frictionless
- Burnout detection: If one person is doing everything, gently prompt others to step in
- Journaling: Quick private space for the caregiver to vent or process

### 2. The Dignity Problem
Nobody wants to feel "managed." The care recipient's experience matters enormously.
- They should see a simple, friendly interface — not a task management board
- Their view might be conversational: "Good morning! You have a doctor's appointment at 2pm. Sarah is picking you up at 1:30."
- They should be able to contribute: mark things done, add their own notes, ask questions
- Some things should be invisible to them (financial discussions between siblings, for instance)

### 3. Handoffs and Transitions
- When the primary caregiver goes on vacation, who takes over? The app should make handoff seamless — a "briefing" for the temporary caregiver
- Life transitions: moving from independent living to assisted living, or from two parents at home to one (after a death)
- The app should handle grief transitions gracefully (archiving a care circle, preserving memories)

### 4. The Historical Record
- Doctors always ask "when did this start?" and nobody remembers. A timeline of medical events, medication changes, symptoms is incredibly valuable
- Legal situations (guardianship, estate planning) benefit from a documented care history
- "What did Dr. Martinez say last time?" should be instantly answerable

### 5. Emergency Readiness
- One-tap access to an emergency card: medications, allergies, conditions, emergency contacts, insurance info, hospital preference
- If the care recipient is alone and something happens, anyone in the circle should be able to pull up critical info instantly
- This could even be a shareable link/QR code on a physical card in their wallet

### 6. Financial Tracking
- Caregiving has real costs: gas, medications, groceries, home modifications
- Siblings splitting costs need transparency
- Tax implications: some caregiving expenses are deductible
- This doesn't need to be an accounting app, just enough to prevent resentment

### 7. Integration With the Chaos
- The real world sends information through email, texts, apps, paper handouts, verbal instructions
- The killer feature is: forward an email, paste a text, snap a photo of a handout → AI extracts the relevant action items
- Calendar sync (Google, Apple, Outlook) for appointments
- Pharmacy notification forwarding
- School portal integration (eventually)

### 8. Privacy and Compliance
- HIPAA: If you store Protected Health Information (PHI) — medical records, diagnoses, prescriptions — you need HIPAA compliance. This means encrypted storage, access controls, audit logs, BAAs with cloud providers, and potentially SOC 2 certification.
- Strategy option: Don't store PHI directly. Let users write free-text notes ("Mom's appointment went well, doctor adjusting her BP medication"). This is user-generated content, not PHI from a covered entity. This keeps you out of HIPAA scope initially while still being useful.
- COPPA: If kids under 13 use the app, you need parental consent mechanisms.
- FERPA: If you integrate with school data, there are education privacy laws.
- Start with the "notes and tasks" approach. Grow into formal medical record integration later with proper compliance infrastructure.

---

## App Architecture — The Core Concepts

### Care Circles
The fundamental unit. A Care Circle is a group of people organized around caring for someone or something.

Examples:
- "Mom's Care" — 3 siblings + Mom herself + a home health aide
- "The Kids" — both parents + grandma + the nanny
- "Buster" — both partners
- "My Recovery" — just me + my spouse

A person can be in multiple circles (you care for your parent AND your kids).

### Roles Within a Circle
- **Organizer**: Full access, manages the circle, invites members, sets permissions
- **Caregiver**: Can see and complete tasks, add notes, participate in conversations
- **Supporter**: Limited view — gets updates and summaries, can send encouragement, can volunteer for tasks
- **Care Recipient**: Customizable view — could range from "full participant" to "simple daily view" to "not in the app at all"
- **Professional**: Time-boxed access for hired help (dog walker, home aide, nanny) — sees only what's relevant to their responsibilities

### Plans
A Plan is a structured set of goals and tasks within a circle. A circle can have multiple plans.

Examples within "Mom's Care":
- Medical Plan (appointments, medications, symptoms)
- Daily Living Plan (meals, groceries, house maintenance)  
- Financial Plan (bills, insurance, expense tracking)
- Social Plan (make sure Mom isn't isolated — visits, calls, activities)

### Concerns
A Concern is a time-sensitive item that needs attention. It surfaces to the top. It might come from a plan, from AI analysis, or from a person.

Examples:
- "Mom's prescription runs out in 3 days"
- "Photo day is Saturday at noon — need hat and black pants"
- "Nobody has checked in with Dad since Tuesday"
- "Buster's flea medication is due this week"

### The Daily Brief
Every user's home screen answers one question: **"What do I need to care about right now?"**

This is a prioritized, personalized view across all their circles:
1. Urgent concerns (medication due, appointment today)
2. Tasks assigned to you today
3. Updates from your circles (notes, completions, messages)
4. Gentle nudges ("You haven't checked in on Mom's circle this week")

This is where the GTD philosophy lives — you should be able to look at this screen and trust that nothing is falling through the cracks.

### Conversations
Every plan, concern, or task can have a conversation thread. But there's also a general circle conversation.

Key principle: **Every message has a clear visibility scope.** You always know exactly who can see what you're writing. Color-coded, icon-marked, impossible to miss.

- Circle-wide: everyone in the circle
- Caregivers only: excludes the care recipient (for sensitive discussions)
- Direct: between two members
- With context: attached to a specific task or concern

### AI Throughout

The AI isn't a separate feature — it's woven into everything:

- **Intake**: "Mom has a cardiology appointment next Thursday at 2pm with Dr. Chen at St. Mary's" → creates the event, assigns a driver, creates a follow-up task
- **Extraction**: Forward a coach's email → AI pulls out what's relevant to YOUR kid
- **Daily Brief**: AI composes the morning summary conversationally
- **Suggestions**: "Sarah has driven Mom to her last 4 appointments. Would you like to take the next one?"
- **Check-ins**: For the care recipient: "Good morning! Push this button to tell me how you're feeling" → logs it, flags if concerning
- **Reporting**: Weekly digest to all circle members: here's what happened, here's what's coming, here's how effort was distributed
- **Smart delegation**: When a new task comes in, AI suggests who should handle it based on proximity, availability, historical patterns, and current load

---

## The Flow (User Journey)

### First Launch
1. Sign up → "Who do you care for?" (parent, child, pet, yourself, someone else)
2. Create your first circle → name it, describe the situation conversationally
3. AI asks a few questions: "How many people help care for [name]? What's the biggest challenge right now?"
4. AI generates a starter plan based on the situation
5. Invite others → they get a warm, non-clinical invitation: "Will invited you to help care for Mom"

### Daily Use (Primary Caregiver)
1. Open app → Daily Brief: "Good morning. Mom has her cardiology appointment at 2pm. You're driving. 3 things to ask Dr. Chen (based on last week's notes). Buster needs his evening meds by 6pm."
2. After appointment → voice note or quick text: "Doctor said her BP is better, reducing lisinopril to 10mg, follow up in 6 weeks" → AI logs it, updates medication plan, creates follow-up appointment reminder, notifies siblings
3. Evening → mark Buster's meds as done → partner sees confirmation without having to ask
4. Quick message from brother: "How'd the appointment go?" → AI already drafted a summary he can see

### Daily Use (Remote Sibling)
1. Open app → sees update: "Mom's cardiology appointment today — BP improving, medication adjusted. Sarah handled it."
2. Prompted: "Want to call Mom tonight and check in? Here's what to ask about."
3. After calling → quick note: "Talked to Mom, she sounded good, mentioned her knee is bothering her again"
4. AI flags the knee note for the next doctor visit prep

### Daily Use (Care Recipient)
1. Simple home screen: "Good morning, Margaret! Today: Take your morning medications (pill organizer, top left). Sarah is picking you up at 1:30 for Dr. Chen. David might call this evening."
2. Can tap "Done" on medications
3. Can press a button to talk to the app: "I'm feeling a little dizzy today" → logged, flagged if concerning, shared with caregivers
4. No task management UI. No complexity. Just a friendly, clear guide through the day.

---

## Naming Exploration

### App Name Candidates

The name should evoke warmth, togetherness, and gentle reliability. Not clinical, not corporate, not cutesy.

| Name | Domain Options | Pros | Cons |
|------|---------------|------|------|
| **Tend** | tend.app, tend.care, tendapp.com | Warm verb. "Tending to someone." Natural. | Some existing products use it |
| **Hearth** | hearth.app, hearthcare.com | Center of the home. Warmth. Safety. | Might read as home/real estate |
| **Kith** | kith.app, kithcare.com | "Kith and kin" — friends and family. Distinctive. | Fashion brand exists. Obscure word. |
| **Steward** | steward.app, stewardly.com | Exactly what caregivers are. Noble. | Slightly formal/corporate |
| **Rally** | rally.care, rallycare.com | "Rally around someone." Action-oriented. | Might feel too energetic for the context |
| **Compass** | compass.care, getcompass.app | Guidance, direction, "what's next." | Real estate company Compass is large |
| **Nest** | nest.care, nesttogether.com | Safety, family, home. | Google Nest exists |
| **Grove** | grove.care, groveapp.com | Living, growing, natural, peaceful | Cleaning product company exists |
| **Haven** | haven.care, havenapp.com | Safety, refuge, peace | Common but good |
| **Kinly** | kinly.app, kinly.care | Kin + -ly. Family-oriented. Warm. | Check trademark availability |
| **Tended** | tended.app, tended.care | Past participle — implies ongoing care that's been handled | Fresh, likely available |
| **Gently** | gently.app, gently.care | The manner of care. Soft, kind, approachable. | Might feel too soft for a business tool |

### Internal Vocabulary (Consistent Naming)

The words you use inside the app define how people think about the experience. Here's a cohesive vocabulary:

| Concept | Proposed Term | Why |
|---------|--------------|-----|
| The group caring for someone | **Circle** | Warmth, togetherness, no hierarchy implied |
| The person/pet being cared for | **Heart** (of the circle) | Not "patient" or "dependent" — they're the heart of why everyone is here |
| The people providing care | **Members** | Neutral, inclusive. Not "caretakers" (too clinical) |
| The primary caregiver | **Anchor** | They hold things together. Acknowledges their role without burdening it |
| A structured set of care goals | **Plan** | Simple, understood, not clinical |
| A time-sensitive item | **Concern** | Already in your doc. Perfect — not "alert" or "issue" |
| A single action item | **Task** or **To-do** | Keep it simple |
| A completed action + notes | **Update** | Not "log entry" — it's a human update |
| The daily home screen | **Today** | Clear, present, calming |
| AI-generated summaries | **Digest** | Familiar from email, implies distilled information |
| Conversation threads | **Thread** | Universally understood |
| Forwarded/imported info | **Intake** | The act of bringing information into the system |

---

## Business Model

### Freemium
- **Free tier**: 1 circle, up to 3 members, basic plans and tasks, limited AI (X messages/month)
- **Premium** ($7-10/month per user or $15-20/family): Unlimited circles, unlimited members, full AI, integrations, care recipient app, digest emails, financial tracking
- **Professional** ($25-30/month): For trainers, nutritionists, therapists — client management, plan templates, branded experience

### Why This Works
- Free tier is enough for a couple managing a pet or simple kid logistics (hook)
- The moment you add siblings to an aging parent circle, you need premium (natural upgrade trigger)
- Professional tier is a different buyer with clear ROI

### Growth Loops
- Every circle invitation is an organic acquisition channel
- "Your brother David invited you to help care for Mom" is an incredibly compelling reason to download an app
- Care recipients telling friends: "My kids use this app and I always know what's happening"

---

## Competitive Landscape

| Category | Competitors | Why Care Is Different |
|----------|------------|----------------------|
| Caregiving | CaringBridge, Lotsa Helping Hands, CareZone | These are either journals (CaringBridge) or meal train coordinators. None do intelligent task distribution, AI extraction, or multi-domain care. |
| Family Organization | Cozi, FamilyWall, OurHome | Calendar/list apps without care-specific intelligence. No concept of care recipient vs caregiver. |
| Co-Parenting | OurFamilyWizard, TalkingParents | Focused on custody/legal. Adversarial framing, not collaborative. |
| Pet Care | 11pets, Pet Desk | Single-purpose. No human care crossover. |
| To-Do / Productivity | Todoist, Things, Notion, Any.do | General purpose. No care-specific concepts, no role-based views, no AI extraction from life chaos. |

The gap: **Nobody has built a care-first platform that works across all the types of care a single person juggles, with AI that actually reduces the cognitive load rather than adding another app to manage.**

---

## Technical Considerations

### MVP Stack Suggestion
- **Mobile-first**: React Native or Flutter (caregivers live on their phones)
- **Web app**: For longer planning sessions, admin, professional tier
- **Backend**: Node.js or Python with a real-time capable framework
- **Database**: PostgreSQL for structured data + vector store for AI context
- **AI**: OpenAI/Anthropic API for conversational features, extraction, summarization
- **Auth**: Phone number first (easiest for elderly care recipients), email optional
- **Notifications**: Push notifications are critical — but must be respectful. "Notification fatigue" kills care apps.

### MVP Feature Set (v1)
1. Create a circle, invite members
2. Role-based permissions (organizer, caregiver, supporter, care recipient)
3. Create plans with tasks (manual + AI-assisted)
4. Daily Brief screen ("Today")
5. Task completion with notes
6. Circle conversation with visibility controls
7. AI intake (paste/type unstructured info → extracted tasks)
8. Push notifications for concerns and assignments
9. Weekly digest (email or in-app)

### What to Defer
- Calendar integrations (v2)
- Email forwarding/extraction (v2)
- Financial tracking (v2)
- Care recipient simplified app (v2 — start with them as regular members)
- Professional/B2B tier (v3)
- HIPAA compliance for formal medical records (v3+)

---

## Open Questions

1. **Single app or separate care recipient app?** A simplified "care recipient mode" in the same app vs. a dedicated companion app (like how Tile has a separate "find my" experience for the tracked person).

2. **How aggressive should AI be?** Should it proactively assign tasks or only suggest? Proactive feels powerful but could cause conflict ("The app told me to do it, not my sister").

3. **Monetization timing**: Free as long as possible for growth, or gate early to validate willingness to pay?

4. **Geographic features**: Should the app know where people are (for proximity-based task assignment)? Powerful but privacy-sensitive.

5. **What's the wedge?** Which single use case do you launch with and nail before expanding? Aging parent care is the most emotionally compelling and underserved. Pet care is the simplest to build and test with.
