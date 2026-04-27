'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import MDEditor from '@uiw/react-md-editor';
import CreditIcon from '@/app/CreditIcon';

// ─── Hardcoded Sample Data ─────────────────────────────────────────────────────
const SAMPLE_NOTES = {
  exam: `


# CQL Design and Security Requirements in Software Development

## Exam Status and Administrative Updates

The exam for this subject has not yet been graded. Grading is currently in progress for another subject (networking), and the process will continue to this subject afterward. Scores should be reported in the system by next week or possibly the week after, depending on workload. This week and weekend are occupied due to the SIT Festival celebrating the school's 30th anniversary.

---

## Recap: CQL Design in the SDLC

This lecture returns to the topic of CQL design, which represents the second process in the SDLC (Software Development Lifecycle). The focus remains on **bottom-up** or **ground-up** software built from scratch.

### Design Fraud versus Bugs

The lecturer distinguishes between two categories of defects:

- **Bug**: A malfunction or mistake in the code—a technical failure.
- **Design Fraud**: A flaw originating from bad design rather than technology failure. Fraud may not be the fault of the technology itself but rather the result of design decisions.

> 💡 Lecturer's Note: The shift-left paradigm emphasizes correcting flaws as early as possible to limit costs. Any mistake made in the SDLC becomes significantly more expensive to fix as the project progresses into later stages.

---

## Protecting Sensitive Data

Security considerations begin at the requirements phase. When interviewing customers, determine:

- The required level of security
- The types of data the software will handle

### Baseline Security Measures

The following should be planned and implemented from the requirements phase onward:

- **Encrypt data in transit** — minimum requirement is HTTPS
- **Validate input and output**
- **Use security headers**

### Data Sensitivity Considerations

When data is sensitive, the design must address:

1. **Retention period** — How long will the data be stored?
2. **Cloud migration** — Will data be moved to public cloud infrastructure?

### Regulatory Considerations: Thailand Cloud Law

> 💡 Lecturer's Note: The lecturer recently attended a meeting with NCSA (National Cyber Security Agency, referred to as "Sokoma Shaw NCSA"), the Thai government agency responsible for cybersecurity law. NCSA is launching a new digital cybersecurity law addressing cloud infrastructure and security standards.

**Key regulation**: Government data or citizen data in Thailand stored in the cloud must use cloud services located only in Thailand or at minimum within the Southeast Asia region. Data cannot be migrated to cloud servers in Europe, the United States, Australia, or other regions.

This represents a regulatory and legal risk—not purely a cybersecurity concern. As a cybersecurity designer or architect, you must study relevant laws in your working area. Cloud data migration depends on territorial and regional regulations; this is fundamentally a legal issue, not a technology issue.

---

## Password Security and Data Breach Monitoring

### Password Storage Requirements

Passwords should be:

- **Hashed**
- **Salted**
- **Peppered**

### Data Leak Detection

A recent data breach in Thailand involved approximately **100,000 records** of citizen data leaked from a hospital onto the dark web. Such incidents are common, which is why cybersecurity defensive measures are essential.

**Recommendation**: Set up alerts for data leaks. Options include:

- Manual monitoring
- Professional third-party services that scan for leaked data from your system

---

## Zero Trust Paradigm

> 💡 Lecturer's Note: Never trust or verify. In 2026, systems operate under the zero trust paradigm. Previously, systems were designed with internal trust and trustless boundaries.

---

## Security Design Review

### Importance of External Review

After completing your design—based on the TOR (Terms of Reference) or other specifications from the requirements phase—do not work in isolation. As an architect creating a blueprint for your home or a map for your city, you must:

- **Request comments from security experts**
- **Consult with other professionals**

### Cost Comparison

Security design reviews are more cost-effective than conducting penetration testing later. Current pen testing costs have become expensive. Example: The lecturer serves as a consultant for a government agency in Thailand, and their pen testing quote reached **4 million baht** for a small system.

> 💡 Lecturer's Note: Pen testing represents a valuable career opportunity. The lecturer joked that retiring from teaching to become a pen tester might be more lucrative. Students are encouraged to enroll in pen testing or hands-on security classes when possible, as large tech enterprises and vendors actively need these services.

---

## Backup and Rollback Procedures

**Critical rule #1**: Practice rolling back your backup. A backup is useless if you don't know how to restore it. Practice is essential.

**Critical rule #2**: Execute the backup. Set simple rules, such as backing up your laptop every three months. Use calendar reminders, task lists, or automation tools to reduce burden.

---

## Server-Side Security Validation

### Client-Side versus Server-Side Validation

Most developers, especially students, implement validation only on the front end (client side). However, for serious applications, **server-side validation is also required**.

**Attack technique**: During penetration testing, attackers use proxy tools (such as BurpSuite) positioned between the client and server. Even if client-side validation passes, the proxy can modify the payload or headers before they reach the server.

> 💡 Lecturer's Note: BurpSuite is software used for web application penetration testing by intercepting and modifying payloads through a proxy.

---

## Framework Development: Do Not Reinvent the Wheel

### The Misconception About Custom Frameworks

A talented student attempted to create a new cybersecurity framework for Java in their capstone project, but the project was not successful.

**Golden rule**: Do not try to write your own framework. A custom framework depends solely on your site alone—a single-site framework. Problems include:

- No interoperability with other systems
- Difficulty for customers and other business sections to connect with your system

**Standardized frameworks** are developed from the practical experience of many people across many cases worldwide. The principle is: **do not reinvent the wheel**.

---

## Security Function Isolation

### The Golden Rule

When possible, isolate security functions from the main system. If the system is compromised, isolation ensures the attacker cannot compromise the entire security system.

### Implementation Guidelines

- **Input validation**: Create validation in a separate object or class, not within the same class as other components.
- **Authentication and authorization**: Implement these as separate applications, not within the main application.

---

## Identity Management

### Two Approaches

**Option 1: Traditional Identity Management**
Build your own system where users register directly on your platform (e.g., creating a member system for a website).

**Option 2: Federated Identity Management**
Allow users to log in using third-party credentials (Google, Facebook, Apple ID).

### Federated Identity Definition

Federated identity means users can authenticate through existing accounts from major technology companies.

### Recommendation

For applications dealing with the public, **use federated identity management**. Benefits include:

- Pushing the burden of identity management and security to third-party companies (Google, Facebook, Apple)

### Exceptions

Federated identity cannot be used when:

- The application requires additional user information beyond what third parties provide
- Regulations mandate direct identity management

> 💡 Lecturer's Note: Identity management is extremely difficult in IT systems because it involves sensitive information and managing secrets for multiple people. The lecturer's best practice: use third-party identity management whenever possible to avoid holding sensitive user data in your own database. Only collect such data if it's a core requirement from the customer or mandated by regulation.

---

## Secret Management (System Secrets)

### Clarification

This section covers **system secrets**, not user secrets.

### What Is a System Secret?

A system secret includes credentials the system uses internally, such as:

- Database connection strings
- Private keys for SSH connections
- Credentials for system-to-system authentication (AWS, Active Directory, OpenLDAP)

### The Secret Vault

System secrets should be stored in a **secret vault**—a secure container (like a bank safe) that:

- Protects secrets from unauthorized access
- **Prevents human beings from accessing secrets directly**
- Only the system can retrieve secrets from the vault

### Access Workflow

1. User attempts to access a protected system requiring authentication
2. The system challenges the user with MFA (multi-factor authentication)
3. Upon successful authentication, the vault provides the necessary secret
4. The secret is used to access the target system

> 💡 Lecturer's Note: Even system-to-system authentication requires secret management. Use secret vault software for proper handling of system secrets.

---

## Authentication for Transactions: CSRF Protection

### Cross-Site Request Forgery (CSRF)

CSRF is an attack where:

1. A user logs into a banking or sensitive system
2. An attacker sends the user a malicious link (via email, ads, etc.)
3. When clicked, the link executes an action (e.g., transferring money) using the user's active session

### Defense Against CSRF

**Best practice**: Require the user to provide something only they can supply before every important action (purchase, transfer).

**Implementation**: Use CSRF tokens:

1. Server generates a unique CSRF token and sends it to the client
2. Browser includes the token with each request (form submission, etc.)
3. Server validates the token before processing the action
4. External attackers cannot provide the token because it was issued only to the legitimate user

**Alternative user verification**: Ask for password re-entry, CAPTCHA completion, or other secrets known only to the user.

---

## Segregation of Production Data

### Development versus Production Environments

**Best practice**: Always separate development and production environments.

When developing software, AWAY PRO provides two environments:

- **Development environment**: For testing new functions, plugins, and extensions
- **Production environment**: The live, stable system

This segregation prevents changes in development from affecting the production system.

> 💡 Lecturer's Note: This practice should be implemented from the beginning of development operations, including CI/CD pipeline planning.

---

## Protection of Source Code: Open Source versus Closed Source

### Two Factions in Software Development

**Closed Source Faction**
- Views source code as intellectual property and trade secrets
- Keeps code hidden from public view
- Motto: **Security through obscurity** ("If the thief cannot see the blueprint of your home, they cannot rob it")

**Open Source Faction**
- Believes source code should be publicly available
- Inspired by **Richard Stallman**, founder of the GNU project
- Stallman is a US computer scientist known for his bison/buffalo logo and his appearance resembling religious iconography
- **Linus Torvalds** (father of Linux) formulated **Linus Law**: "Given enough eyeballs, all bugs are shallow"—meaning open code allows many people to find and fix vulnerabilities

### Research Findings

A 2022 survey comparing bugs and vulnerabilities in open source versus closed source software found the numbers are **almost equal**. This suggests that opening or closing source code does not significantly affect vulnerability counts.

### Security Perspective

From a security expert's viewpoint, **closed source is recommended** because:

1. Open source relies on volunteers to review code, but few people actually donate time to bug hunting (it's unpaid work)
2. Even popular open source projects (like Discord) have only a small group actively reviewing code
3. Malicious attackers can study open source code for months or years to find vulnerabilities

However, this decision ultimately depends on business model and perspective.

### Defense in Depth

Regardless of the open/closed source decision, closed source should be considered one layer in a **defense in depth** strategy—using multiple countermeasures for comprehensive security.

---

## Announcement: KMUTT Air Quality Monitoring System

The Office of Building and Ground Management (IBGM) at KMUTT has launched a new web-based air quality monitoring system.

**Access**: \`apps.ibgm.cloud\`

Six weather stations have been installed across the Bang Mod campus:

- The lecture is taking place in CB2 building
- School of Information Technology (N11) is in this area
- Relevant stations: **N12** and **N18**

Station N18 currently shows an **AQI of 87** (moderate air quality), which is not ideal for this time of year.

---

## Understanding AQI (Air Quality Index)

### How AQI Is Calculated

AQI is an integrated index that varies by country. In Thailand, AQI is calculated from **five substances**:

1. Carbon dioxide (CO2)
2. Ozone
3. PM2.5 (particulate matter 2.5 nanometers)
4. PM10 (particulate matter 10 nanometers)
5. Sulfur dioxide (SO2)

### Determining the AQI Value

For each substance, there are limits corresponding to different color codes (blue, green, yellow, orange, red). The **worst-performing substance** determines the overall AQI.

**Example**: If four substances are in the "good" range but one is in the "dangerous" range, the AQI reflects the dangerous level.

### Thailand's Primary Concern

PM2.5 (dust from China and other sources) is typically the main contributor to AQI readings in Thailand.

### Color Coding Differences

- **Thailand**: Blue → Green → Yellow (and higher)
- **United States**: Green → Yellow → Orange → Red → Violet

Students must study AQI standards for the specific country they are in.

---

## System Architecture of the Air Quality Monitoring Platform

### IoT Implementation

The system uses **Internet of Things** (IoT) technology:

- Hardware weather stations installed on buildings
- Each station contains **six sensors**:
  - Temperature
  - Humidity
  - CO2
  - PM2.5
  - PM10
  - Noise

### Data Flow

1. Each station loops and submits sensor data in **JSON format** to the backend
2. Backend is a **web service application** receiving the data
3. Frontend is a **web application** loaded in browsers to display data from the database

---

## Threat Modeling: Definition and Importance

### What Is Threat Modeling?

**Threat modeling** is a process for identifying and defining all threats a business, application, system, or product will likely face.

**Key distinction**: Threat modeling differs from penetration testing.

- **Penetration testing**: Hands-on technical activity to physically penetrate the system
- **Threat modeling**: Simulation using blueprints or architecture diagrams to brainstorm potential threats by examining each component

### Who Should Know Threat Modeling?

Even if you are not working specifically in cybersecurity, as a developer you should understand threat modeling.

### The Threat Modeling Process

1. Think about potential threats to each component
2. Ask questions such as:
   - Could someone intercept and sell our data to competitors?
   - What value would that have?
   - What harm could result if it happened?
   - How can we protect against this?

3. After listing all threats, review code to ensure each threat is properly addressed
4. If vulnerabilities remain, modify the application to mitigate them

---

## Handling Identified Threats: Three Options

When threat modeling reveals a threat you cannot easily eliminate:

### Option 1: Adversarial Resilience

Change the code, design, or specification to completely remove the vulnerability.

**Example**: For a data center building vulnerable to earthquakes, this would mean redesigning the entire building specification—extremely expensive.

### Option 2: Risk Acceptance

Accept the risk if the probability of occurrence is very low.

**Example**: After analysis, Thailand has had few earthquakes in the past 20 years, so accepting this risk may be justified based on statistical calculation.

### Option 3: Risk Transfer

Find a third party to accept the risk instead of you—typically through insurance.

**Example**: When traveling abroad, purchasing travel insurance transfers the risk of trip cancellation, medical emergencies, etc., to the insurance company.

---

## The Threat Modeling Framework (OWASP)

The OWASP-recommended framework consists of **five steps**:

### Step 1: Set an Objective

Define what you want to accomplish from the threat modeling exercise.

### Step 2: Visualize What You Are Building

Create a blueprint of the system. For software, this means drawing a **DFD (Data Flow Diagram)**.

**DFD Levels**:
- **Level 0 DFD**: Overall picture of the system—simple, showing only primary actors and system boundaries
- **Level 1 DFD**: Shows additional logical components and processes
- **Level 2 DFD**: Shows detailed processes (e.g., search, reservation, cancellation, database interactions)

> 💡 Lecturer's Note: Based on the lecturer's experience, most production and business software uses **Level 2 DFD** for threat modeling. However, some less critical projects may only need Level 0 or Level 1.

### Step 3: Identify Threats

Traverse the DFD component by component and entity by entity, identifying what threats could affect each one.

### Step 4: Determine Mitigation

For each identified threat, brainstorm appropriate countermeasures.

### Step 5: Validate

After completing the process, validate that all threats were properly addressed.

---

## DFD and Trust Boundaries

### Drawing the DFD for Threat Modeling

When creating a threat modeling diagram:

1. Draw the appropriate level DFD for your application
2. Identify the **trust boundary**—a line separating trusted areas (internal network) from untrusted areas (internet)

### What Is a Trust Boundary?

A trust boundary indicates where communication transitions between:

- **Untrusted area**: The public internet
- **Trusted area**: Your company's internal network

After crossing the trust boundary, analyze what communications occur and what threats might exist.

---

## The STRIDE Model (Microsoft)

When identifying threats, the **STRIDE model** from Microsoft is one of the most popular frameworks.

**STRIDE Acronym**:

| Letter | Category | Description |
|--------|----------|-------------|
| **S** | Spoofing | Impersonating someone or something else |
| **T** | Tampering | Modifying data or code |
| **R** | Repudiation | Denying having performed an action |
| **I** | Information Disclosure | Exposing information to unauthorized parties |
| **D** | Denial of Service | Making a system unavailable |
| **E** | Elevation of Privilege | Gaining capabilities without proper authorization |

### Applying STRIDE

For each component in your DFD:

1. Identify which STRIDE threat categories could apply
2. Document them in a table for that component
3. List corresponding countermeasures (controls)

### Example Threat Modeling Table Format

| Component | Asset | Threat Agent | Threat Category | Control/Countermeasure |
|-----------|-------|--------------|-----------------|------------------------|
| Browser | A02: Sensitive application data, A03: Session ticket, A04: Username/password | TA04: Authorized internal application user | [STRIDE category] | C02: External application user authentication |

---

## Block 2 Assignment: Threat Modeling

### Assignment Overview

**Due**: Three weeks before the Block 2 examination

**Format**: PDF submission containing:

- Threat modeling diagram
- Details of threat analysis using the STRIDE model

### Tools Allowed

- Any diagram tool (Draw.io, Microsoft Office, etc.)
- **Microsoft Threat Modeling Tool** (recommended and free)

### Project Selection

**Option A**: Use your capstone project system if you have one.

**Option B**: If you are doing capstone research or are an exchange student without a capstone project, use the **KMUTT Air Quality Measurement System** (the system just demonstrated).

- Propose sufficient detail about the project
- Show related diagrams
- Draw the data flow diagram
- Perform threat modeling analysis on each component

### Resources

The lecturer has provided videos on the Microsoft Teams channel for this subject:

- OWASP definition of threat modeling
- "Threat Modeling for Beginners in 20 Minutes"
- "Real-World Threat Modeling with Microsoft Threat Modeling Tools"

### Submission

Submit through Microsoft Teams. Further details will be posted in the assignment section on Microsoft Teams.

---

## Final Notes

The timeframe for this assignment is **three weeks**. Review all materials carefully and utilize the provided resources for threat modeling tools and techniques.
  `,
  
  standard: `
# CQL Design and Threat Modeling

## Course Administration

The exam for this subject has not yet been graded. Grading is currently in progress for another subject in the networking area, which is a second-year junior course. Scores will be reported to the system likely next week or the week after, depending on workload. This week and weekend are occupied due to the SIT Festival celebrating the school's 30-year anniversary.

---

## CQL Design Recap

### Position in SDLC

CQL Design is the second process in the Software Development Life Cycle (SDLC). This lecture continues from the previous session and focuses specifically on **security requirements during the design process**. The discussion centers on **bottom-up or ground-up software** — systems built from scratch.

### Fraud vs. Bugs

A critical distinction made in this course:

- **Fraud** occurs due to a bad design — it may not be a fault of the technology itself, but rather a fault based on the design approach. This is why we call it *design fraud*.
- **Bugs** are malfunctions or mistakes in the code — a technical issue when compared to fraud.

### Shift Left Paradigm

The shift left paradigm emphasizes correcting faults as early as possible in the SDLC to limit costs. For any mistake made during development, the cost escalates significantly as the mistake moves forward through later stages. Addressing issues at the very late span costs much more than addressing them earlier.

---

## Protecting Sensitive Data

### Requirement Phase Activities

When starting from the requirement phase, you must:

1. **Conduct interviews** with customers to determine:
   - The required level of security
   - The types of data the software will handle

2. **Plan for data protection**, including:
   - Encrypting data in transit (use HTTPS at minimum)
   - Validating all input and output
   - Implementing security headers

### Data Sensitivity Considerations

When data is sensitive, the design phase must address:

- **Retention periods**: How long will sensitive data be stored?
- **Cloud migration**: Will data be moved to public cloud infrastructure?

### Government Regulation Context

A recent meeting with Thailand's government agency **Sokoma Shaw NCSA** (National Cybersecurity Agency) revealed important regulatory developments:

- The **Cybersecurity, Digital Cybersecurity Law** is being launched regarding cloud infrastructure
- This law addresses how data should be kept in cloud systems and establishes security standards
- **Key regulation**: Government data or citizen data in Thailand kept in cloud must use infrastructure located only in Thailand or at minimum within the Southeast Asia region
- Data **cannot be migrated** to cloud regions in Europe, the US, Australia, or other locations due to this law

> 💡 Lecturer's Note: This is not purely a cybersecurity issue — it is a regulation and legal risk. As a cybersecurity designer or architect, you must study relevant laws in your area of work. Moving data into public cloud depends on the territory and region — this is a legal matter, not a technology matter.

### Password Security Requirements

Passwords should be:
- **Hashed**
- **Salted**
- **Peppered**

### Data Leak Alerts

A recent data breach was discovered on the dark web — approximately **100,000 records** of citizen data leaked from a hospital in Thailand. Such incidents highlight why cybersecurity defensive measures are essential.

To address this:
- Set up alerts when data from your system appears leaked online
- **Manual monitoring** or **professional third-party services** can be used
- Services from third-party companies or software can check for data leaks from your system

---

## Zero Trust Paradigm

The principle of **never trust or verify** has been discussed multiple times. Modern systems (as of 2026) operate under the **zero trust paradigm**.

- **Old model**: Internal trust with trustless boundary
- **Current model**: Zero trust — never implicitly trust any entity

---

## Security Design Review

### Review Process

1. After completing your design and covering everything according to the **TOR (Term of Reference)** or other specifications from the requirement phase, review your design with a security professional
2. This is similar to writing a blueprint for your home or creating a map for a city
3. **Do not work alone** — discuss, revise, and request comments from other security experts

### Cost Considerations

Security design reviews are more cost-effective than conducting penetration testing later because:
- Pen testing costs have become very expensive in the market
- **Example**: Consulting with a government agency in Thailand for pen testing on a small system costs approximately **4 million baht**

> 💡 Lecturer's Note: Pen testing represents a career opportunity worth pursuing. The cost of pen tests has increased dramatically, and if you have the chance to enroll in pen testing or hands-on security classes, do not miss that opportunity. Most vendors and large tech enterprise companies are very concerned about cybersecurity and need pen testing services.

---

## Backup and Rollback Procedures

### Two Essential Rules

**Rule Number One**: You must practice the way to roll back your backup. Having a backup is useless if you do not know how to restore it.

**Rule Number Two**: Run the backup regularly. Simple rules include:
- Set up a schedule (e.g., back up your laptop every three months)
- Use calendar tasks and to-do lists
- Use automation tools to reduce burden
- Find a backup method that does not add more workload to your life

---

## Server-Side Security Validation

### The Validation Gap

While validating both client-side and server-side is standard practice, many developers — especially students — only implement client-side validation on the front end.

### Why Server-Side Validation is Essential

When conducting penetration testing on web systems, attackers use proxies (such as **BurpSuite**) installed between the client and the server. This technique allows them to:
1. Intercept requests after client-side validation has passed
2. Modify the payload or headers before forwarding to the server

Even if client-side validation has already validated the input, a proxy can alter it mid-transmission. Therefore, for serious applications, **server-side validation is required** — validate input before it arrives at your server, not just on the client side.

---

## Framework Considerations

### The "Do Not Reinvent the Wheel" Principle

A student with exceptional talent attempted to create a new cybersecurity framework for Java as their capstone project. This project was not fully successful.

**Why you should not develop your own framework:**

1. A custom framework becomes a **single-site framework** — dependent only on your specific implementation
2. **Standardized frameworks** are developed from the practical experience of many people and many cases worldwide
3. With a custom framework, you may create sophisticated encryption or complex systems, but **nobody else can connect with your system**
4. It becomes difficult for customers and other business sections to integrate with your system

> 💡 Lecturer's Note: In the world of technology, we do not have to reinvent the wheel again. The wheel is already defined — just use it.

---

## Security Function Isolation

### The Golden Rule

When possible, **isolate the security function from your main system**.

### Why Isolation Matters

When your system is compromised, if the security function is already isolated from the main system, the attacker cannot compromise the entire security system.

### Implementation Guidelines

- **Validation isolation**: Create validation in a separate object or class rather than implementing validation functions within the same object or class as other components
- **Authentication/authorization isolation**: Use separate applications for authentication and authorization rather than integrating them with your main application
- **Identity management isolation**: Treat identity management as a separate component

---

## Identity Management Options

### Option 1: Create Your Own Identity Management

Traditional approach where you build the member/subscriber registration system yourself.

### Option 2: Federated Identity Management

Federated identity allows users to log in using third-party accounts such as Google, Facebook, or Apple ID.

### When to Use Federated Identity

For applications dealing with the public, **federated identity management is preferable** because:
- It pushes the burden of identity management and security to large tech companies
- You avoid holding sensitive user data in your system

### When to Use Custom Identity Management

Custom identity management is necessary when:
- Your application requires more specific information about users
- Customer requirements demand it
- Regulatory requirements mandate it

> 💡 Lecturer's Note: Identity management (IDM) is one of the most challenging aspects of IT systems. It involves sensitive information and requires managing secrets for multiple people. If I need to develop a system, I will use third-party identity management whenever possible — I do not want to hold sensitive data of others in my system unless it is a main requirement from the customer or a regulation from the company or country. The best practice is to use federated identity management.

---

## System Secret Management

### System Secret vs. User Secret

**System secret management** refers to secrets used by the system — not user secrets. For example:
- Connection strings for database access (backend to database)
- These are system secrets, not user secrets

### The Secret Vault Concept

A **secret vault** is software used to store system secrets securely — like a banking safe that protects secrets from other systems and entities.

**Key principle**: Human beings should never access secrets in the secret management system. Only the system can access secrets inside the vault, except during:
- Initial insertion
- Updates
- Emergency situations

### Access Flow

1. User requests access to a protected system
2. System requires a secret to authenticate
3. User provides credentials stored in the vault
4. MFA (multi-factor authentication) challenges the user to access the vault

This applies to:
- Human-to-system login
- System-to-system communication (e.g., accessing AWS, Active Directory AD, database, OpenLDAP)
- SSH private keys for secure shell connections to other systems

### Recommendation

Use secret vault software for all system secret management needs.

---

## CSRF (Cross-Site Request Forgery) Protection

### What is CSRF?

Cross-site request forgery occurs when:
1. A user logs into a system (e.g., a banking website) and has an active session
2. A malicious actor sends the user a link
3. Clicking the link causes automatic actions (e.g., money transfer) without the user's proper consent

### Defense Against CSRF

The best defense is to **ask the user for something only they can provide** before any important action:
- A password re-entry
- Completing a CAPTCHA
- A secret token known only to the user and server

### Implementation

1. Client visits URL on browser
2. Server generates and writes a **CSRF token** to challenge the client
3. Browser/client posts the form with the CSRF token
4. A malicious user providing an external link will not have the valid CSRF token from the server
5. The server rejects the request

---

## Segregation of Environments

### Development vs. Production

The fundamental principle is to **separate development environment from production environment**.

**Why this matters**:
- When developing software, you need an environment where you can safely try new functions, plugins, and extensions
- Changes in the development environment do not affect the production environment
- This best practice should be implemented from the start of project planning, including CI/CD pipeline design

---

## Source Code Protection

### The Debate: Open Source vs. Closed Source

#### Closed Source Faction

- Views source code as a secret and asset
- Believes code should remain proprietary — intellectual property
- Tries to close source as much as possible

#### Open Source Faction

- Believes source code should be open to the public
- Led by **Richard Stallman**, a US computer scientist and engineer
- Stallman is the founder of the **GNU project** (GNU = "GNU's Not Unix" — created because Unix was expensive at the time)
- GNU's logo is a bison/buffalo with fruit
- Stallman is known for his distinctive appearance (sometimes resembling religious imagery)

#### Linux Connection

- **Linus Torvalds** is the father of Linux
- **Linus Law**: "Given enough eyeballs, all bugs are shallow"
- Open source believers argue that opening code allows many people to observe and improve it

### Research Findings

Based on research from 2022, there is **no significant difference** in the number of bugs and vulnerabilities between open source and closed source software. The numbers are almost equal.

### Security Perspective

From a security expert's perspective, **you should close your source code** because:

1. Open source provides attackers with time (potentially a year) to study code and find vulnerabilities
2. In reality, even popular open source projects with millions of users have only a few people actually reviewing code for bugs — this is unpaid work, so few people volunteer their time
3. Closed source adds a layer to the **defense in depth** strategy

> 💡 Lecturer's Note: If you read a security-focused textbook, they will advise closing source code. If you read a software engineering textbook, they may advocate open source based on the GNU concept. Since we study application security, your business should protect source code by closing it and preventing leaks of secrets and vulnerabilities.

---

## Air Quality Monitoring System Announcement

The Office of Building and Ground Management at KMUTT has launched a new web-based system for air quality monitoring.

### Access Information

- **Website**: \`apps.ibgm.cloud\`
- May also access via \`apps.ibgm.cloud.webster\`
- **Campus**: Bang Mot campus
- **Six weather stations** installed throughout the campus

### Station Locations

- CB2 building area (current lecture location)
- School of Information Technology is at **N11**
- Available stations for this area: **N12** and **N18**

### Current Reading Example

Station N18 shows an AQI (Air Quality Index) of approximately **87**, which is classified as **moderate**.

### How AQI is Calculated

AQI is an integrated index, not specific to one substance, and varies by country.

#### Thailand's AQI Calculation (5 Substances)

1. Carbon dioxide (CO2)
2. Ozone
3. PM2.5 (particulate matter 2.5 nanometers)
4. PM10 (particulate matter 10 nanometers)
5. Sulfur dioxide (SO2)

**Process**: The worst measurement among the five substances is used as the representative AQI. For example, if four substances show "blue" level but one shows "red," the total AQI is red.

#### Color Coding Differences

| Country | Color Progression |
|---------|-------------------|
| Thailand | Blue → Green → Yellow → Orange → Red |
| US | Green → Yellow → Orange → Red → Violet |

#### PM2.5 in Thailand

PM2.5 is the primary AQI indicator in Thailand because:
- Dust and particulate matter 2.5 nanometers frequently blows from China to southern Thailand
- This is the most common substance causing poor air quality

### Technical Implementation

This is an **IoT (Internet of Things) system**:

1. **Hardware**: Weather station installed on each building with **six sensors**:
   - Temperature
   - Humidity
   - CO2
   - PM2.5
   - PM10
   - Noise

2. **Data Transmission**: Each station loops and submits sensor data in **JSON format** to the backend

3. **Architecture**:
   - Backend: Web service application receiving data
   - Frontend: Web browser interface presenting data from the database

---

## Threat Modeling

### What is Threat Modeling?

Threat modeling is a **critical skill** that even common developers (not just cybersecurity professionals) should know. It is a process for checking vulnerabilities and finding threats in your application.

### Threat Modeling vs. Penetration Testing

- **Penetration testing** is hands-on — physically attempting to penetrate your system
- **Threat modeling** is simulation-based — you have a map/blueprint of your application, examine components one by one, and brainstorm what threats can occur

### Questions to Ask During Threat Modeling

1. Will people try to intercept your data and sell it to competitors?
2. Would there be any value if they did?
3. What harm could come if that happened?
4. How can we protect against this?

### The Process

After listing all threats, go back to your code, check each threat one by one, and verify whether you have properly avoided each threat and whether they are covered by your project security requirements.

### When Threats Cannot Be Avoided

If a threat cannot be avoided (like an earthquake for a data center building), you have three choices:

#### Option 1: Adversarial Resilience (Mitigation)

Change code or design for protection — completely change the approach. In the data center example, this would mean changing the entire building specification, which is very expensive.

#### Option 2: Risk Acceptance

Accept the risk. This does not mean giving up — it means evaluating that the **probability of occurrence is low**. In the earthquake example, after studying data, Thailand has rarely experienced earthquakes in the past 20 years, so the risk may be acceptable.

#### Option 3: Risk Transfer

Find a third party to accept the risk instead of you — use money to solve the problem. Example: **Buying insurance**. When traveling abroad, purchasing travel insurance transfers the risk to the insurance company.

---

## Threat Modeling Framework (OWASP)

The framework for threat modeling consists of five steps:

### Step 1: Set an Objective

Define what you want to accomplish — state your objective before starting.

### Step 2: Visualize What You Are Building

Create a blueprint of what you are analyzing. The appropriate visualization depends on context:

- **Physical building**: Use engineer's blueprints
- **Software**: Use a **DFD (Data Flow Diagram)**

### Step 3: Identify Threats

Travel through the DFD component by component, entity by entity, and identify what threats can occur on each component.

### Step 4: Determine Mitigation

For each identified threat, brainstorm what countermeasures can handle those threats.

### Step 5: Validate

After completing the process, validate everything — did you do a good job?

---

## Data Flow Diagrams for Threat Modeling

### DFD Levels

Data Flow Diagrams have multiple levels:

- **Level 0 DFD**: Overview picture of the system — shows only a few entities (e.g., passenger and admin for a reservation system)
- **Level 1 DFD**: Shows additional logical components and processes related to the system
- **Level 2 DFD**: Shows detailed processes (e.g., search reservation, booking process, cancel process, inquiry writing to database)
- **Level 3+ DFD**: More detailed diagrams as needed

### Recommended Level for Threat Modeling

Based on lecturer experience, the **second-level DFD** is the base for software threat modeling:
- Draw at least a second-level data flow diagram
- Some projects may only need Level 1 or even Level 0 depending on scope
- Production and business software typically uses second-level DFD for threat modeling

### Trust Boundaries

When drawing threat modeling diagrams:
1. Draw the DFD
2. Create **trust boundary lines** showing separation between public and internal networks

**Trust boundary definition**: A line showing the area between untrusted areas (internet) and trusted areas (internal network).

---

## STRIDE Framework (Microsoft)

**STRIDE** is Microsoft's model for threat identification during threat modeling:

| Letter | Category | Description |
|--------|----------|-------------|
| **S** | Spoofing | Spoofing identity |
| **T** | Tampering | Tampering with data |
| **R** | Repudiation | Repudiation |
| **I** | Information Disclosure | Information disclosure |
| **D** | Denial of Service | Denial of service |
| **E** | Elevation of Privilege | Escalating privilege level after compromising the system |

### How to Apply STRIDE

For each component in your DFD:
1. Analyze what threats can occur using STRIDE categories
2. Note and list threats in a table for that component
3. List countermeasures for each threat

### Threat Modeling Table Example

| Component | Asset | Threat Agent | Control |
|-----------|-------|--------------|---------|
| Browser (Flash, JavaScript) | A02: Sensitive application data | TA04: Authorized internal application user | C02: External application user authentication |
| | A03: Session ticket | | |
| | A04: Application username and password | | |

---

## Block 2 Assignment: Threat Modeling Diagram

### Assignment Overview

Create a threat modeling diagram based on:
- Your **capstone project** (if doing a system project and already have a data flow diagram)
- The **KMUTT Air Quality Measurement System** (if doing capstone research or are an exchange student without a capstone project)

### Requirements

1. Show the diagram of the selected project
2. Draw the data flow diagram of that project
3. Run threat modeling to analyze threats for each component

### Submission Details

- **Format**: PDF
- **Tool options**: Any diagram tool (draw.io, Microsoft Office, etc.)
- **Microsoft's free tool**: Download **Microsoft Threat Modeling Tool** from Google — it automatically analyzes STRIDE frameworks based on your DFD
- **Submission location**: Microsoft Teams

### Timeline

- **Duration**: Three weeks (before the Block 2 examination)
- This is not a one-week assignment

### Additional Resources

Video materials are available on the Microsoft Teams channel for this subject:
- Definition of threat modeling by OWASP
- What is threat modeling and why it is important
- Threat modeling for beginners (20 minutes)
- How to do real-world threat modeling with Microsoft Threat Modeling Tools

> 💡 Lecturer's Note: For students with their own capstone project, use that project for your threat modeling analysis. For students doing capstone research or exchange students, freely choose any interesting project and run the threat modeling. Provide enough detail about the project — if you have additional diagrams related to the project, include them in your work. Check Microsoft Teams for more detailed assignment specifications.
  `,
  
  textbook: `
# Security Requirements in CQL Design

## Introduction: The Software Development Lifecycle and Security

The software development lifecycle (SDLC) consists of multiple distinct phases, each playing a critical role in the overall success of a software project. Among these phases, design holds particular significance because it is during this stage that fundamental decisions are made about how a system will be structured, how data will flow, and how security will be integrated. This lecture returns to the topic of CQL design, specifically focusing on the security requirements that must be considered during the design process. The context here is bottom-up or ground-up software development—meaning software that is being built entirely from scratch rather than being based on an existing system or framework.

Understanding security requirements in the design phase is not merely an optional enhancement; it is a fundamental necessity that affects every subsequent phase of development and the ultimate safety of end users. The decisions made during design echo throughout the entire lifecycle and determine how resilient the final system will be against attack.

## Understanding Defects: Design Fraud Versus Security Bugs

A fundamental distinction that must be understood clearly is the difference between design fraud and security bugs. These two categories of defects are often conflated, but they arise from fundamentally different sources and require different approaches to address.

A bug, in the general sense, is a malfunction or mistake in the code. When developers write code incorrectly, whether through misunderstanding, oversight, or human error, the result is a bug. Bugs are technical in nature and typically result from implementation mistakes at the code level.

Design fraud, on the other hand, is something different. Design fraud occurs not because of a failure in technology or a mistake in coding, but because of a failure based on the design itself. When the foundational design of a system is flawed—when the conceptual architecture is built upon a weak foundation—subsequent code written on top of that design will inherit the vulnerability. The technology itself may function perfectly, but the underlying design creates conditions where security can be compromised.

The implication of this distinction is profound: fixing a design fraud is not simply a matter of rewriting code. The entire design must be revisited and revised. This is why addressing defects as early as possible in the SDLC is so critically important.

## The Shift Left Paradigm

The shift left paradigm represents a fundamental philosophy in modern software development and security practices. The core idea is straightforward: try to correct defects as early in the development process as possible, because the cost of fixing problems increases dramatically as the project progresses through its lifecycle.

If a mistake is made during the requirements or design phase, the cost to correct it is relatively low. The same mistake, discovered later in development or, worse yet, after the system has been deployed to production, becomes exponentially more expensive to fix. This is not merely an economic consideration—though the financial implications are significant—but also a matter of resource allocation, team morale, and risk management.

The shift left paradigm therefore advocates for moving security considerations, quality assurance, and error correction earlier in the timeline. By catching and addressing issues early, organizations can limit the total cost they have to pay and reduce the risk of catastrophic failures reaching production systems.

## Protecting Sensitive Data at the Requirements Stage

The protection of sensitive data must begin at the very first phase of the SDLC—the requirements phase. This is not a step that can be deferred to later stages; the foundational decisions about data protection must be made when the system is being conceptualized.

During requirements gathering, one of the critical tasks is to conduct interviews with customers to understand what level of protection they require and how many kinds of data the software will involve. Different systems handle different categories of data, and the sensitivity of that data dictates the level of protection required.

Some of the fundamental protections that must be planned for and decided upon during the requirements phase include:

**Encryption of data in transit**: Data must be encrypted whenever it moves between systems or across networks. At minimum, HTTPS should be used for all communications. This ensures that even if data is intercepted during transmission, it remains unreadable to unauthorized parties.

**Input and output validation**: All data entering and leaving the system must be validated. This prevents malicious data from entering the system and ensures that the system does not inadvertently expose sensitive information in its outputs.

**Security headers**: Proper security headers must be configured to provide additional layers of protection. These headers instruct browsers on how to behave when interacting with the application, helping to prevent various classes of attacks.

These considerations should be documented and discussed from the very beginning of the project, not added as afterthoughts once the system is nearly complete.

## Data Sensitivity, Storage Duration, and Cloud Migration Regulations

When data is classified as sensitive, designers must think carefully about several additional factors beyond just encryption and validation. Two particularly important considerations are the duration of data storage and the question of cloud migration.

### Storage Duration

How long will sensitive data be retained? Different types of data have different retention requirements based on legal obligations, business needs, and practical considerations. The longer sensitive data is kept, the longer it remains a potential target for attackers. Designers must make conscious decisions about retention periods and implement mechanisms to securely delete data when it is no longer needed.

### Cloud Migration Considerations

An emerging and critically important consideration is whether sensitive data will be moved to public cloud infrastructure. This decision has significant legal and regulatory implications that extend far beyond technical considerations.

To illustrate this point, the lecturer referenced a meeting with a Thai government agency called NCSA—the National Cybersecurity Agency. NCSA is responsible for cybersecurity law in Thailand and functions in a role similar to a cyber police organization. During the week of this lecture, the lecturer had returned from a meeting with NCSA where they discussed an upcoming cybersecurity and digital cybersecurity law concerning cloud services.

One of the key statements in this new law concerns data that must be kept in cloud infrastructure. Specifically, government data or citizen data in Thailand that must be stored in the cloud can only use cloud services located within Thailand or at minimum within the Southeast Asia region. This means that organizations cannot migrate such data to cloud infrastructure in Europe, the United States, Australia, or any other region outside the permitted zone.

This represents a regulatory risk and a legal consideration that cybersecurity designers and architects must understand. The decision to use public cloud services is not purely a technical decision—it is heavily influenced by the territory and region in which the organization operates and the laws that govern data residency in those areas.

> 💡 Lecturer's Note: This is not about cybersecurity technology—it is about regulation and law. As a cybersecurity designer or architect, you also have to study about the laws regarding the area you are going to be working in. This is very important. Moving data into the public cloud depends upon the territory, depends upon the region that you are working. This is a legal consideration, not a technology consideration.

The lecturer further noted that they had been in a debate with government agents from NCSA regarding this new law and had filed many questions about it. The lecturer expressed an intention to share more about the new law later in the course when there is an opportunity, noting that it is written in Thai and would need to be translated into English first.

## Password Security: Hashing, Salting, and Peppering

Password security remains one of the foundational elements of application security. Even as authentication technologies evolve, passwords continue to play a central role in most systems. When designing systems that handle authentication, the following practices must be implemented:

**Hashing**: Passwords should never be stored in plain text. Instead, they should be processed through cryptographic hash functions that transform the password into an irreversible string of characters. Even if the database is compromised, the actual passwords remain hidden.

**Salting**: A salt is a random value that is added to each password before hashing. This ensures that identical passwords will produce different hash values, making precomputed attack tables (rainbow tables) ineffective.

**Peppering**: A pepper is similar to a salt but is kept secret and stored separately from the hashed passwords. It provides an additional layer of security that protects against certain categories of attacks.

These techniques must be implemented correctly to provide meaningful protection. Poor implementation of any of these techniques significantly reduces their effectiveness.

## Data Leak Alerts

Given the prevalence of data breaches in the modern digital landscape, systems must be designed with the capability to detect and alert when data has been leaked online. This is a defensive measure that acknowledges the reality that breaches can and do occur despite best efforts at prevention.

The lecturer mentioned that a new data breach had recently been discovered on the dark web involving citizen data leaked from a hospital. Approximately 100,000 records were exposed. Such incidents, while alarming, demonstrate why defensive security measures are necessary—it is not enough to simply prevent breaches; systems must also be able to detect when breaches have occurred.

Alert systems for data leaks can be implemented in two ways:

**Manual monitoring**: Organizations can actively search for evidence of their data appearing in breach databases or on the dark web. This requires dedicated resources and ongoing attention.

**Professional services**: Third-party companies offer services that continuously monitor for data leaks related to a specific organization. These services use various techniques to detect when organizational data appears in unauthorized locations.

Implementing such alerts does not prevent breaches, but it enables faster response when breaches do occur, potentially limiting the damage that results from prolonged exposure.

## The Zero Trust Paradigm

The lecture emphasized the importance of the never trust or zero trust paradigm in modern system design. This represents a fundamental shift from older security models that relied on the concept of an internal trusted network and an external untrusted boundary.

In the past, systems were often designed with the assumption that anything inside the network perimeter could be trusted. This approach has proven fundamentally flawed because once an attacker gains access to the internal network, they have free reign to move laterally and access sensitive systems.

The zero trust paradigm, which is the current standard as of 2026, operates on the principle that no user, device, or system should be automatically trusted simply because it is inside the network perimeter. Every access request must be verified, every communication must be authenticated, and trust must be earned rather than assumed.

When designing systems, this principle must be embedded throughout the architecture. The system should not assume that because something is internal, it is safe. Verification must occur at every step.

## Security Design Review

After completing the initial design decisions, it is essential to engage with security professionals to review the design. This is analogous to creating a blueprint for a home or a map for a city—before construction begins, experts should examine the plans to identify potential issues.

The review should verify that all security requirements identified during the requirements phase have been addressed and that the design follows applicable standards such as technical reference documents or terms of reference that were established earlier in the project.

> 💡 Lecturer's Note: Don't do this alone. You might have to consult with other people, asking for comments from other security experts. This is very important. Security design reviews are more effective than doing penetration testing later.

The reason for this emphasis is economic. Penetration testing—commonly called pen testing—in the current market is very expensive. A recent experience with a government agency in Thailand illustrates this point: a small system pen test was quoted at four million baht. The cost of pen testing has truly "gone crazy" in today's market.

However, the lecturer also noted that this represents an opportunity. Pen testing is a career path that offers significant financial compensation, and students are encouraged to take advantage of any opportunity to enroll in pen testing classes or hands-on security courses.

> 💡 Lecturer's Note: If you have a chance to enroll in a pen testing class or another hands-on security class, don't miss that chance. It's a good opportunity, and it makes a lot of money nowadays because most vendors and big tech enterprise companies are scared of cybersecurity a lot. So they do need to do pen testing.

The contrast was made humorously: with pen testing costs being what they are, perhaps it would be more lucrative to retire from academia and become a pen tester rather than continuing as a lecturer.

## Backup and Rollback Procedures

Backup procedures are critical for disaster recovery and business continuity, but they must be implemented correctly to be effective. The lecturer emphasized two fundamental rules:

**Rule number one: You must practice the way to roll back your backup.** Simply having a backup is not sufficient. If the process for restoring from that backup has not been tested and practiced, the backup is essentially useless when it is actually needed. Organizations must regularly test their backup restoration procedures to ensure they work correctly.

**Rule number two: You must run the backup.** This sounds obvious, but in practice, backups often fail to run because of configuration errors, storage issues, or simply being forgotten. Simple rules should be established, such as backing up laptops every three months, and these rules should be tracked through calendars and to-do lists. Automation tools should be used to handle backups without adding burden to daily workflows. The goal is to make backup processes simple and sustainable.

## Server-Side and Client-Side Validation

When developing web applications, validation of user input must be implemented on both the client side and the server side. Many developers, particularly students, make the mistake of implementing validation only on the front end, in the browser.

Client-side validation improves user experience by providing immediate feedback, but it is not sufficient for security purposes. When an attacker or penetration tester wants to attack a web system, they can use a proxy tool installed between the client and the server. Even if the client-side code has validated the input and it has passed from the browser, the attacker can intercept the request at the proxy and modify the payload or headers before they are sent to the server.

One popular tool for this type of testing is BurpSuite, which is widely used for penetration testing of web applications. It allows testers to intercept requests, modify them, and forward them to the server, bypassing any client-side validation that was in place.

> 💡 Lecturer's Note: For serious applications, you should do server-side validation, not only client-side validation. You must validate even the input before the input arrives at your server.

Server-side validation ensures that even if client-side validation is bypassed, the server still checks all input for safety before processing it.

## Framework Misconceptions and the Don't Reinvent the Wheel Principle

A common misconception in software development, particularly among talented students, is the desire to create new security frameworks from scratch. The lecturer shared an example of a student who attempted to create a new cybersecurity framework for Java in their capstone project. This project was not particularly successful in achieving its goal.

The fundamental principle that should guide developers is: **do not try to write your own framework**. When developers create their own frameworks, those frameworks become single-site frameworks that depend only on their own implementation. This creates several problems:

First, a self-created framework has not been tested across many different organizations, use cases, and environments. A standardized framework, on the other hand, has been studied and refined based on the practical experiences of many people and many cases from around the world. It represents accumulated wisdom and best practices.

Second, a custom framework creates interoperability problems. If your system uses a proprietary framework with unique encryption methods or other security implementations, other systems cannot connect with it. This creates friction in business operations and makes it difficult for customers and other parts of the organization to integrate with your system.

> 💡 Lecturer's Note: There is a password in the world of technology that we don't have to reinvent the wheel again. Because the wheel is already defined, so just use it.

The principle of not reinventing the wheel exists because in most cases, the problems being solved have already been solved. The existing solutions have been refined over time and are more reliable than something new that has not been tested.

## Security Function Isolation

The golden rule of security architecture states that when possible, security functions should be isolated from the main system. This principle exists because of a fundamental truth about security: when a system is compromised, if the security function is integrated into the same system, the attacker may be able to compromise the security controls themselves.

Isolation provides a protective barrier. If security functions are separated from the main application, even when the main system is compromised, the security function may remain intact and continue to provide protection.

In practice, this isolation should be implemented in several ways:

**Separate validation objects and classes**: When implementing input validation, this should be done in a separate object or class, not integrated into the same objects that handle other business logic. Mixing security functions with normal component functions creates vulnerability.

**Separate authentication and authorization applications**: Authentication and authorization should be handled by separate applications or services, not integrated into the main application. This allows the security function to be maintained and updated independently.

**Component-based paradigm**: When designing systems, think about functions as modules—first module, second module, third module—and apply security strategies to each module individually. Modules handling identity verification, device verification, and network security should be isolated into separate functional areas.

This approach makes code cleaner, easier to maintain, and easier to audit for security vulnerabilities. When vulnerability checks are run, having isolated components makes it much easier to identify which specific component has an issue.

## Identity Management: Traditional Versus Federated

Identity management is one of the most challenging aspects of information technology systems. It is full of sensitive information and requires managing secrets for many different people. It is often described as one of the greatest headaches in IT.

When developing a system that needs to handle user identity, there are two fundamental choices:

**Traditional identity management**: This approach involves creating your own identity management system from scratch. When developing a website that allows people to register and become members, traditional identity management means building and maintaining all the infrastructure for user accounts, password storage, session management, and identity verification internally.

**Federated identity management**: Federated identity is the approach where users log into a website using credentials from a third party, such as Google, Facebook, or Apple. When you visit a site and see options to "Log in with Google" or "Log in with Facebook," that is federated identity in action.

For applications that must deal with the general public, federated identity management is generally the better choice. It provides significant advantages:

- The burden of identity management is pushed to large technology companies that have dedicated security teams and significant resources to invest in identity protection.
- The developer does not need to store sensitive identity information in their own database.
- Users benefit from single sign-on experiences they already know.

However, federated identity is not always possible. Some applications require more information about users than what federated identity providers make available. In such cases, traditional identity management may be necessary, and in those cases, the developer must take full responsibility for protecting the sensitive identity data in their own database.

> 💡 Lecturer's Note: If I have to develop some system, I will try to use third-party identity management as much as I can. I don't want to hold any sensitive data of other people in my system, in my database. The best practice is to try to use federated identity management.

When traditional identity management is unavoidable due to requirements or regulations, the security of that identity data becomes paramount.

## Secret Management: System Secrets Versus User Secrets

A critical distinction that must be understood is the difference between user secrets and system secrets. The lecture specifically emphasized that the secret management being discussed here is not about user secrets like passwords—it is about system secrets.

**What are system secrets?** System secrets are the secrets that systems use to communicate with each other. For example, when writing backend code that connects to a database, a connection string is required. That connection string is a system secret. It is not a human password—it is a credential that one system uses to authenticate to another system.

System secrets include:
- Database connection strings
- API keys for accessing external services
- Credentials for connecting to AWS, Active Directory (AD), OpenLDAP, and other infrastructure services
- Private keys used for secure shell (SSH) connections between systems

The fundamental principle of system secret management is that human beings should never access the secrets in the secret management system. Only systems should be able to access system secrets.

To achieve this, organizations use software called a secret vault. This is a dedicated application that stores system secrets in a secure container, similar to how a bank safe protects valuable items. The vault prevents human access to the secrets stored within it—only other systems can retrieve secrets from the vault when they need them to perform their functions.

The vault stores secrets except when they are first put in, when they are being updated, or in case of an emergency. This controlled access ensures that secrets are protected throughout their lifecycle.

When a user needs to access a protected system, the system requires a secret to authenticate the user. The user does not know the secret stored in the vault. Instead, there should be some challenge mechanism such as multi-factor authentication (MFA) to verify the user before granting access to the vault. This applies not only to human login scenarios but also to system-to-system authentication. When one system needs to access another system, proper secret management protocols must be followed.

## Authentication for Transactions: Cross-Site Request Forgery

One important attack vector that must be defended against is cross-site request forgery, commonly abbreviated as CSRF. Understanding CSRF and how to defend against it is essential for anyone designing web applications.

**What is cross-site request forgery?** CSRF is an attack that exploits the trust a web application places in a user's browser. The attack works as follows:

1. A user logs into a trusted system, such as a banking application, and maintains an active session.
2. The user is tricked into clicking a malicious link, often delivered through email, chat, or a compromised website.
3. This link, when clicked, sends a request to the trusted application that performs an action the user did not intend—such as transferring money to an attacker's account.
4. Because the user is already logged in and has a valid session cookie, the application processes the request as if it were legitimate.

The key insight is that the attack originates from a different site (hence "cross-site") and tricks the user's browser into making a forged request (hence "request forgery").

**How to defend against CSRF?** The best way to defend against CSRF is to require the user to provide something that only the legitimate user can provide before every important action. This typically takes the form of a CSRF token.

The process works as follows:

1. When a user visits a page with a form, the server generates a unique CSRF token and includes it in the form as a hidden field.
2. The token is specific to that user and that session, and only the user and the server know it.
3. When the form is submitted, the token is sent along with the other form data.
4. The server verifies that the token is present and matches what it expects.
5. If a malicious user tries to craft a request without the legitimate token (for example, by sending a link that submits a form), the attack fails because the attacker does not know the correct token.

The fundamental principle is simple: ask the user for something that only the user could provide. This could be re-entering a password, completing a CAPTCHA, or providing a secret token that only the user and server know. Each important request should include this verification step.

## Segregation of Development and Production Data

A fundamental best practice in software development and operations is the separation of development and production environments. This concept is known as the segregation of production data.

When developing software, two distinct environments should be maintained:

**Development environment**: This environment is used for building, testing, and experimenting with new features. Developers can upload changes, try new plugins, test extensions, and make modifications without affecting the production system that real users depend on.

**Production environment**: This is the live system that serves actual users. Changes should only be made here after thorough testing in the development environment.

This segregation protects the production system from instability and errors that might arise during the development process. It also allows developers to work freely and experiment without the fear of breaking the system that customers rely on.

This principle should be implemented from the very beginning of a project, during the planning phase for development operations. For organizations using continuous integration and continuous deployment (CI/CD) pipelines, this separation is built into the workflow.

## Protection of Source Code: The Open Source Versus Closed Source Debate

The protection of source code is a topic that generates significant debate in the technology community. Source code is undeniably an asset—particularly for businesses, where source code often represents core intellectual property that provides competitive advantage.

The technology world has long been divided between two fundamental philosophies:

### The Closed Source Faction

The closed source faction holds that source code is a secret and an asset that should be kept confidential. Organizations in this camp make efforts to close their source code as much as possible, treating it as intellectual property that must be protected from public view.

The philosophy behind this approach can be summarized as security through obscurity. The reasoning is simple: if a thief cannot see the blueprint of your home, they cannot figure out how to break into it. By keeping source code hidden, organizations believe they make it harder for attackers to find and exploit vulnerabilities.

### The Open Source Faction

The open source faction takes the opposite approach, believing that source code should be open to the public as much as possible. This philosophy has produced many widely-used software products, including the Linux operating system.

The founder of the open source movement is Richard Stallman, a computer scientist and engineer who lives in the United States. Stallman founded the GNU project, which created a free operating system designed as an alternative to Unix (which was expensive at the time). GNU stands for "GNU is Not Unix." Stallman is known for his distinctive appearance and has been photographed looking similar to Jesus in Renaissance paintings. The GNU project uses a bison buffalo as its logo, depicted as a wildebeest about to charge at a computer. The lecturer mentioned having a GNU sticker on their laptop, obtained from an open source conference.

The open source faction gained another major figure with Linus Torvalds, who created the Linux kernel. Torvalds is known for what has become called Linus Law, which states: "Given enough eyeballs, all bugs are shallow."

The logic of Linus Law is that open source code is reviewed by many people, and these reviewers help identify and eliminate bugs and vulnerabilities. The phrase "enough eyeballs" refers to having enough people examining the code to catch problems. The reasoning is optimistic: by opening source code to public scrutiny, the collective intelligence of the community helps improve the software.

### Resolving the Debate

The question of whether to open or close source code is ultimately not a technical question—it is a business question that should be answered based on the business model.

However, from a pure security perspective, research from 2022 by Check Point compared the number of bugs and vulnerabilities in closed source software versus open source software. The finding was that the number of bugs and vulnerabilities is almost equal in both categories. This statistic challenges the optimistic assumption that open source code is significantly more secure due to public review.

The security perspective on this matter tends toward closing source code, for several reasons:

First, in reality, even for popular open source projects with millions of users, only a very small number of people actually spend time reviewing the code for vulnerabilities. Bug hunting and vulnerability research are not paid activities in most cases, so most people do not donate their time to this effort. The "enough eyeballs" promised by Linus Law does not materialize in practice.

Second, when source code is open to the public, malicious attackers have time—sometimes years—to study the code and find vulnerabilities. Even though closed source code can also have vulnerabilities, the additional barrier of code obscurity provides one more layer of defense.

Third, the research showing equal vulnerability counts actually supports the closed source approach from a defense in depth perspective. Defense in depth means using multiple layers of countermeasures to protect systems. Closing source code is one of those layers. Even if it does not eliminate vulnerabilities, it makes the attacker's job harder by removing one avenue of reconnaissance.

> 💡 Lecturer's Note: If you read a textbook from the security side, they will suggest you to close the source code. If you read a textbook from the software engineering side, the open source advocates will introduce concepts of GNU and open source suggesting you should open your source code and hope somebody helps you eliminate bugs and vulnerabilities. Based on the best practice in application security, your business should protect the source code. Close the source code and prevent leakage of secrets and vulnerabilities from your code.

The lecture emphasized that this is a perspective-based conclusion—others may disagree—but from a security standpoint, the recommendation is to close source code as part of a comprehensive defense strategy.

## Air Quality Monitoring System Announcement

Before continuing to the final major topic, the lecture included an announcement from the Office of Building and Ground Management at KMUTT. The office has launched a new web-based system for checking air quality monitoring within the campus.

The system can be accessed at apps.ibgm.cloud, with additional information available at apps.ibgm.cloud.webster. Six weather stations have been installed inside the campus at the Bangmod campus, including one near the School of Information Technology building (N11), with stations numbered N12 and N18 being in the nearby area.

When accessing the system, students can view the Air Quality Index (AQI) from various stations. The AQI reading at station N18 was approximately 87, which is classified as moderate—not ideal air quality for that time of year.

### Understanding the AQI Index

The Air Quality Index is an integrated index that measures air quality based on multiple pollutants. It is not specific to any single substance—the calculation considers several different pollutants simultaneously.

The AQI index calculation varies by country because different nations use different standards and consider different pollutants. In Thailand, the AQI is calculated from five substances:

1. Carbon dioxide (CO2)
2. Ozone (O3)
3. PM2.5—particulate matter with particles 2.5 nanometers in diameter
4. PM10—particulate matter with particles 10 nanometers in diameter
5. Sulfur dioxide (SO2)

The AQI value for any given time is determined by the worst-performing substance among these five. Each substance has its own limit values that correspond to different color codes. For PM2.5 specifically, if the reading is less than 20 micrograms per cubic meter, it receives a blue color code.

The color coding for AQI also differs by country. In the United States, the scale runs from green through yellow, orange, and red, to violet. In Thailand, the scale starts with blue and green, then yellow. Students must understand the AQI standards for whatever country they are in.

In Thailand, the primary air quality concern is typically PM2.5, which is particulate matter carried from China by seasonal winds. This pollutant often becomes the determining factor for Thailand's AQI readings.

### System Architecture

The air quality monitoring system is an Internet of Things (IoT) system. Each weather station hardware installation includes six sensors:

1. Temperature sensor
2. Humidity sensor
3. CO2 sensor
4. PM2.5 sensor
5. PM10 sensor
6. Noise sensor for measuring sound levels

Each station submits sensor data in JSON format to the backend at regular intervals. The backend is a web service application that receives and stores this data. The frontend is a web application that users access through their browsers to view the current readings from various stations.

This system serves as an example of a real-world IoT implementation that students can study and potentially use for practice exercises.

## Threat Modeling: An Essential Skill for All Developers

The final major topic of the lecture was threat modeling, which was described as a very important skill that even non-security professionals should understand.

### What Is Threat Modeling?

Threat modeling is a process used to systematically check for vulnerabilities and find threats to an application, system, or product. The goal is to search and define all threats that the business, application, system, or product will likely face.

It is important to distinguish threat modeling from penetration testing. Pen testing is hands-on work where testers actively try to penetrate a system. Threat modeling, by contrast, is more of a simulation or analytical exercise. You start with a map or blueprint of your application and then examine each component, thinking through what could go wrong. This is a brainstorming process where you consider questions like:

- Will people try to intercept your data and sell it to competitors?
- Would there be any value in doing so?
- What harm could come if that happened?
- How can we protect against this?

After listing all potential threats, you go back and examine your code to verify that each threat has been properly addressed and covered by your security requirements.

### What To Do When Threats Are Found

After completing a threat modeling exercise and identifying potential threats, the next step is to determine mitigations. The lecture outlined three possible choices:

**Adversarial resilience (code redesign)**: Change the code, the design, or the architecture to provide protection against the threat. This means completely modifying the system to eliminate the vulnerability. In the case of physical assets like a data center building, this would mean changing the entire building specification—which would be very expensive.

**Risk acceptance**: Accept that the threat exists but conclude that the likelihood of it occurring is low enough that no action is required. The lecture gave the example of earthquake risk in a data center. After study and debate, the team found that in Thailand, earthquakes have been rare over the past 20 years, so the risk could be accepted based on the low probability of occurrence. Acceptance does not mean giving up—it means making a conscious decision that the cost of mitigation exceeds the expected cost of the risk materializing.

**Risk transfer**: Find a third party to accept the risk instead of you. The most common way to do this is through insurance. When traveling abroad, purchasing travel insurance transfers the risk of things going wrong to the insurance company. They accept the risk in exchange for the premium payment.

These three options—resilience, acceptance, and transfer—form the basis of how organizations deal with risks that cannot be completely eliminated.

## The OWASP Threat Modeling Framework

The framework for conducting threat modeling consists of five steps, as defined by OWASP (the Open Web Application Security Project), the organization known for its work in cybersecurity:

### Step One: Set an Objective

Before beginning threat modeling, you must clearly define what you want to accomplish. What is the objective of this threat modeling exercise? What scope are you considering? What level of assurance do you need?

### Step Two: Visualize What You Are Building

This step involves creating a representation of the system being analyzed. The framework is generic and can apply to any asset, not just software. For a physical building, this would mean obtaining the engineering blueprint. For software, the appropriate representation is a data flow diagram (DFD).

A data flow diagram shows how data moves through a system, identifying the entities, processes, and data stores involved. For threat modeling purposes, the recommended level of detail is at least a Level 2 DFD, which provides sufficient granularity to analyze individual components.

DFD levels work as follows:
- **Level 0 DFD**: Shows the overall system context with minimal detail, like a high-level overview with just a few entities (for example, a reservation system showing only passengers and administrators as actors).
- **Level 1 DFD**: Shows the major logical components and processes of the system at a higher level of detail.
- **Level 2 DFD**: Shows detailed processes, such as individual functions like searching, reservation, cancellation, and database write operations.

Most production software and business software uses Level 2 DFDs for threat modeling, though some less critical systems might only need Level 1 or even Level 0.

### Step Three: Identify Threats

With the data flow diagram completed, you examine each component and entity on the diagram, considering what threats could affect each one. You systematically go through the diagram, identifying potential risks at each point. This creates a list of threats that must be addressed.

### Step Four: Determine Mitigations

For each threat identified, you brainstorm what countermeasures or controls can be applied to mitigate the risk. What will you do about each threat? What protection mechanisms can be put in place?

### Step Five: Validate

After implementing mitigations, you validate everything to ensure the threat modeling was done correctly. Did you identify all significant threats? Are the mitigations effective? Does the final system adequately address the identified risks?

## Understanding Trust Boundaries

When drawing threat modeling diagrams based on data flow diagrams, an important concept to include is the trust boundary. A trust boundary is a line on the diagram that separates areas of trust from areas of distrust.

**Untrusted areas**: The internet is the classic example of an untrusted area. Anything on the public internet cannot be assumed to be secure.

**Trusted areas**: Internal networks within a company are typically considered trusted areas where the organization has more control over the environment.

When you draw the data flow diagram for threat modeling, you must show the trust boundary line to clearly indicate where communication crosses from trusted to untrusted spaces. This visual representation helps identify which processes and data flows may be particularly vulnerable to attack.

## The STRIDE Framework from Microsoft

Once you have identified where threats might exist, you need a systematic method for categorizing those threats. Microsoft has created a widely-used framework called STRIDE for this purpose.

STRIDE is an acronym where each letter represents a category of threat:

**S - Spoofing identity**: Threats where an attacker impersonates a legitimate user or system. This includes stealing credentials, session hijacking, or assuming another person's identity.

**T - Tampering with data**: Threats where data is modified without authorization. This includes man-in-the-middle attacks, data injection, and any unauthorized alteration of information.

**R - Repudiation**: Threats where a user can deny having performed an action because there is no way to prove otherwise. Systems need audit logs and non-repudiation mechanisms.

**I - Information disclosure**: Threats where information is exposed to unauthorized parties. This includes data leaks, interception of communications, and accessing information that should be protected.

**D - Denial of service**: Threats where a system is made unavailable to legitimate users. This includes attacks that overwhelm systems with traffic or exploit vulnerabilities to crash services.

**E - Elevation of privilege**: Threats where an attacker gains higher levels of access than they should have. This includes exploiting vulnerabilities to gain administrator rights or accessing functions beyond the attacker's authorized scope.

STRIDE is one of the most popular models for threat modeling analysis and is widely used in the industry. To use it effectively, you examine each component of your system and consider which categories of threats could apply.

### Creating a Threat Modeling Table

When conducting threat modeling, you typically create a table for each component that includes:

- **Asset**: What valuable data or resources exist in this component? Examples include sensitive application data, session tickets, and usernames and passwords.
- **Threat agent**: Who or what could pose a threat? This includes external attackers, authorized internal users who might misuse access, and other entities.
- **Control (countermeasure)**: What protection mechanisms are in place or should be implemented? For example, external application user authentication or other security controls.

By systematically analyzing each component through the STRIDE lens and documenting the results, you create a comprehensive security analysis of your system.

## Block Two Assignment: Threat Modeling Diagram

The lecture concluded with important information about the Block Two assignment. This assignment is directly related to the threat modeling content just covered.

### Assignment Requirements

Students are required to draw a threat modeling diagram based on either their capstone project or an alternative system. The assignment involves:

1. Drawing or obtaining a data flow diagram for the chosen system
2. Creating trust boundary lines on the diagram
3. Analyzing threats using the STRIDE model
4. Documenting assets, threat agents, and controls in a table format

### For Students with Capstone Projects

Students who are working on a system project for their capstone should use their own capstone project as the basis for this assignment. If they have already created data flow diagrams for their capstone, these can be used as the foundation for the threat modeling analysis.

### For Students Without Capstone Projects

Students who are doing capstone research or are exchange students without a system project have two options:

1. Use the air quality measurement system from KMUTT as their subject. This is the web-based service created by the Office of Building and Cloud Management that was discussed earlier in the lecture.
2. Find another interesting system project to analyze.

In either case, students should include enough detail about the project to make the analysis meaningful, including any existing diagrams of the project and a data flow diagram showing how data moves through the system.

### Submission Details

The assignment is not a one-week exercise—it will be given approximately three weeks before the Block Two examination. This allows adequate time for thorough analysis and diagram creation.

Students should:
- Submit their threat modeling through the Microsoft Teams channel for the course
- Format their submission as a PDF
- Include their diagram and the details of their STRIDE model analysis

Students may use any diagram tool they prefer, including draw.io, Microsoft Office, or any other visualization software. One free tool specifically recommended is the Microsoft Threat Modeling Tool, which is designed specifically for this purpose.

The Microsoft Threat Modeling Tool can automatically help draw threat modeling diagrams and can analyze STRIDE framework categories based on the data flow diagram that is drawn in the software. Students can search online for "Microsoft Threat Modeling Tool" to find the download link.

Additional resources have been provided on the Microsoft Teams channel for the subject, including:
- A video explaining threat modeling definitions from OWASP
- A video on threat modeling for beginners (approximately 20 minutes)
- A video demonstrating real-world threat modeling with Microsoft Threat Modeling Tools

Students are encouraged to spend time studying these materials to understand how to properly conduct threat modeling and use the available tools.

> 💡 Lecturer's Note: More details about the threat modeling assignment will be provided in the assignment posting on Microsoft Teams. Don't forget to check it regularly.

## Summary and Key Takeaways

This lecture covered several interconnected themes in application security design. The core message is that security must be considered from the very beginning of the software development lifecycle, starting in the requirements phase. Key topics included:

- The distinction between design fraud and code bugs, and why addressing defects early is crucial through the shift left paradigm
- The importance of protecting sensitive data through encryption, validation, and careful consideration of storage duration and cloud migration regulations
- Password security through hashing, salting, and peppering, along with data leak monitoring
- The zero trust paradigm as the current standard for system design
- The value of security design reviews and the high cost of penetration testing
- Proper backup procedures with emphasis on practicing rollback
- Server-side validation as a necessary complement to client-side validation
- The principle of not reinventing the wheel through custom security frameworks
- Security function isolation through component-based design
- Identity management options including federated identity as the preferred approach when feasible
- System secret management using vault solutions
- Cross-site request forgery and CSRF token defenses
- Development and production environment segregation
- The ongoing debate about open source versus closed source, and the security perspective favoring closed source as one layer of defense in depth
- Threat modeling as an essential analytical skill for all developers
- The five-step OWASP threat modeling framework
- Data flow diagrams as the visualization tool for threat modeling
- Trust boundaries and the STRIDE framework for threat categorization

These concepts together form the foundation of security-conscious software design that students should carry forward into their professional careers.
  `
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCreatedAt(ts) {
  if (!ts) return '—';
  const withZ = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(withZ).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

function getTier(tokens) {
  if (!tokens || tokens <= 25000) return { label: 'Tier 1', price: 3 };
  if (tokens <= 50000) return { label: 'Tier 2', price: 6 };
  if (tokens <= 75000) return { label: 'Tier 3', price: 10 };
  return { label: 'Tier 4', price: 13 };
}

const styleLabels = { exam: 'Exam Note', standard: 'Standard', textbook: 'Textbook' };

// ─── UI Components ─────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick, icon, danger, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-all
        ${active
          ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-2)] hover:border-[var(--border-hover)] hover:text-[var(--fg)]'}
        ${danger ? 'hover:!border-[rgba(239,68,68,0.3)] hover:!text-[#ef4444]' : ''}`}
    >
      {icon}{children}
    </button>
  );
}

function DetailField({ label, value, editing, editValue, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{label}</div>
      {editing ? (
        <input
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '—'}
          className="bg-[var(--surface-raised)] border border-[rgba(0,212,200,0.25)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--fg)] outline-none focus:border-[rgba(0,212,200,0.5)] transition-colors w-full placeholder:text-[var(--fg-3)] min-h-[32px]"
        />
      ) : (
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--fg)] min-h-[32px] truncate">
          {value || '—'}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function SampleViewerContent() {
  const router = useRouter();
  const t = useTranslations('notes');
  const searchParams = useSearchParams();
  const style = searchParams.get('style') || 'standard';

  const getStyleLabel = (s) => {
    if (s === 'exam') return t('examNote');
    if (s === 'standard') return t('standard');
    if (s === 'textbook') return t('textbook');
    return s;
  };

  const [note, setNote] = useState({
    name: "Application Security Lecture 6",
    generation_type: "Individual",
    language: "English",
    style: style,
    created_at: new Date().toISOString(),
    total_tokens: style === 'exam' ? 14256 : style === 'standard' ? 17199 : 25386,
    charge_amount: style === 'exam' ? 9 : style === 'standard' ? 9 : 17,
    uploaded_filename: "App_Security_Lecture_6.txt",
    content: SAMPLE_NOTES[style] || SAMPLE_NOTES.standard
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [saved, setSaved] = useState(false);

  const [editName, setEditName] = useState(note.name);
  const [editTopic, setEditTopic] = useState(note.lecture_topic);
  const [editInstructor, setEditInstructor] = useState(note.instructor);

  const progressBarRef = useRef(null);

  const handleReaderScroll = (e) => {
    const el = e.target;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${Math.min(100, pct)}%`;
    }
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const copyNote = () => {
    navigator.clipboard.writeText(note.content).catch(() => { });
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  // Fake save that just updates the local state
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setNote(prev => ({ 
        ...prev, 
        content: editContent, 
        name: editName
      }));
      setIsEditing(false);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600); 
  };

  const tier = getTier(note.total_tokens);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <motion.div
            className="flex flex-1 flex-col overflow-hidden min-w-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Page header */}
            <div className="flex-shrink-0 flex items-center justify-between px-7 pt-5 pb-0 gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.back()}
                  className="rounded-lg p-1.5 text-[var(--fg-3)] hover:bg-[var(--surface-tint)] hover:text-[var(--fg)] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-current fill-none stroke-2">
                    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)] select-none truncate">
                  {note.name}
                </h1>
                <span className="rounded bg-[var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)] border border-[var(--accent)]/20">
                  {getStyleLabel(style)} {t('preview')}
                </span>
              </div>
            </div>

            {/* Workspace */}
            <div className="flex flex-1 overflow-hidden gap-3.5 p-5 px-7 min-h-0">

              {/* ── Left panel ── */}
              <div className="flex w-[280px] flex-shrink-0 flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                {/* Source file */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
                  <div className="px-4 py-2.5 border-b border-[var(--border)] text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)] select-none">
                    {t('sourceFile')}
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2.5 opacity-60">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[12.5px] font-medium text-[var(--fg)]">
                          {note.uploaded_filename}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--fg-3)]">
                          {t('uploadedFile')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
                  <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between select-none">
                    <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('detailsLabel')}</div>
                    {isEditing && <div className="text-[10px] text-[var(--accent)] opacity-70">{t('editing')}</div>}
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    <DetailField label={t('noteName')} value={note.name} editing={isEditing} editValue={editName} onChange={setEditName} />
                    <DetailField label={t('language')} value={note.language} editing={false} />
                    <DetailField label={t('generationType')} value={note.generation_type} editing={false} />
                    <DetailField label={t('noteStyle')} value={getStyleLabel(note.style)} editing={false} />
                  </div>
                </div>

                {/* Token breakdown */}
                <div className="rounded-xl border border-[rgba(0,212,200,0.1)] bg-[var(--surface)] overflow-hidden surface-teal">
                  <div className="px-4 py-2.5 border-b border-[var(--border)] text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)] select-none">
                    {t('usageSimulated')}
                  </div>
                  <div className="p-3.5 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[12.5px]">
                      <span className="text-[var(--fg-3)]">{t('totalTokens')}</span>
                      <span className="font-mono text-[12px] text-[var(--fg)]">{note.total_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[12.5px]">
                      <span className="text-[var(--fg-3)]">{t('tierLabel')}</span>
                      <span className="font-mono text-[12px] text-[var(--fg)]">{tier.label}</span>
                    </div>
                    <div className="h-px bg-[var(--surface-tint)] my-1" />
                  </div>
                </div>
              </div>

              {/* ── Right panel ── */}
              <div className="flex flex-1 flex-col overflow-hidden min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">

                {/* Viewer header */}
                <div className="flex-shrink-0 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[13px] font-medium text-[var(--fg-2)]">{t('generatedNote')}</span>
                    <div className="flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#22c55e]">
                      <div className="h-[5px] w-[5px] rounded-full bg-current" />
                      {t('completed')}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <ActionBtn
                      onClick={isEditing ? handleSave : () => setIsEditing(true)}
                      active={isEditing || saved}
                      icon={
                        saved ? (
                          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[2]">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        )
                      }
                    >
                      {saving ? t('saving') : saved ? t('saved') : isEditing ? t('save') : t('sandboxEdit')}
                    </ActionBtn>

                    {isEditing && (
                      <ActionBtn onClick={() => { setIsEditing(false); setEditContent(note.content); }} icon={
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      }>{t('cancel')}</ActionBtn>
                    )}

                    <ActionBtn onClick={copyNote} icon={
                      <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    }>{t('copy')}</ActionBtn>

                    <ActionBtn onClick={() => setIsFullscreen(true)} icon={
                      <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                      </svg>
                    }>{t('fullscreen')}</ActionBtn>

                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden" data-color-mode="dark">
                  {isEditing ? (
                    <MDEditor
                      value={editContent}
                      onChange={setEditContent}
                      height="100%"
                      preview="edit"
                      style={{ background: 'var(--surface)', borderRadius: 0, border: 'none', height: '100%' }}
                    />
                  ) : (
                    <div
                      className="h-full overflow-y-auto px-10 py-8"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                    >
                      {/* Meta chips */}
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        {[
                          {
                            label: formatCreatedAt(note.created_at),
                            icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
                          },
                          {
                            label: styleLabels[note.style],
                            icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
                          },
                          {
                            label: note.instructor ?? note.name,
                            icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
                          },
                        ].map((m, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
                            {m.icon}{m.label}
                          </div>
                        ))}
                      </div>

                      <div className="max-w-[720px]">
                        <MDEditor.Markdown
                          source={note.content}
                          style={{ background: 'transparent', color: 'var(--fg-body)', fontSize: '14px', lineHeight: '2' }}
                          rehypePlugins={[]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* ── Fullscreen reader ── */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col"
          >
            <nav className="h-14 flex-shrink-0 flex items-center justify-between px-8 border-b border-[var(--border-faint)] bg-[var(--surface)] nav-surface">
              <div className="flex items-center gap-4 select-none">
                <span className="font-serif text-[18px] text-[var(--accent)]">Eidolon</span>
                <div className="h-4 w-px bg-[var(--surface-tint)]" />
                <span className="text-[12px] text-[var(--fg-3)] truncate max-w-[400px]">
                  {note.name}{note.lecture_topic ? ` · ${note.lecture_topic}` : ''}
                </span>
                <span className="rounded bg-[var(--accent)]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                  {t('preview')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyNote}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-[12px] text-[var(--fg-2)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)]">
                  <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {t('copyAll')}
                </button>
                <button onClick={() => setIsFullscreen(false)}
                  className="group flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition-all hover:border-[rgba(239,68,68,0.3)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-2 stroke-[var(--fg-3)] group-hover:stroke-[#ef4444] transition-colors">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </nav>

            <div className="h-[2px] w-full bg-[var(--surface-deep)] flex-shrink-0 overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full bg-[var(--accent)]"
                style={{ width: '0%', transition: 'width 60ms linear', willChange: 'width' }}
              />
            </div>

            <div
              className="flex-1 overflow-y-auto py-16 px-8 flex justify-center"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
              onScroll={handleReaderScroll}
            >
              <div className="w-full max-w-[680px]">
                <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-3)] mb-3 select-none">
                  {note.name}{note.lecture_topic ? ` · ${note.lecture_topic}` : ''}
                  <span className="text-[var(--fg-3)] mx-1">·</span>
                  {formatCreatedAt(note.created_at)}
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mb-8 flex items-center gap-2 select-none">
                  {t('generatedByEidolon')} <span className="text-[var(--fg-3)]">·</span>{note.charge_amount} <CreditIcon size={14} color='#9a9aaa'/>
                </div>
                <div data-color-mode="dark">
                  <MDEditor.Markdown
                    source={note.content}
                    style={{ background: 'transparent', color: 'var(--fg-body)', fontSize: '15px', lineHeight: '1.95' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-[12.5px] text-[var(--fg-2)] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'}`}>
        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {t('copiedToClipboard')}
      </div>

    </div>
  );
}

// Next.js 13+ requires useSearchParams to be wrapped in a Suspense boundary 
// when used in a client component that's rendered dynamically.
export default function SampleNoteViewer() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--fg-3)]">Loading preview...</div>}>
      <SampleViewerContent />
    </Suspense>
  );
}