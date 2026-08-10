# HawkBucks Mission Tracker

Create a complete UI/UX plan and frontend architecture for a premium gaming website called "HawkBucks".

HawkBucks is a Fortnite Save The World V-Bucks Mission Tracker.

The website has one main purpose:

Allow users to quickly check if today's Fortnite Save The World missions contain V-Bucks rewards.

The design must be inspired by the existing HawkBucks Telegram bot visual identity.

Reference style:

- Dark futuristic gaming interface

- Premium esports dashboard feeling

- Fortnite Save The World inspired atmosphere

- Neon green / emerald accent colors

- Glassmorphism cards

- Soft glowing borders

- High contrast typography

- Clean information hierarchy

Brand:

Name:

HawkBucks

Logo:

Use the provided HawkBucks logo asset.

Brand feeling:

Reliable, automated, futuristic, community-driven.

## Website Structure

Create a minimal two-page website.

Pages:

1. Home Page

2. About Page

------------------------------------------------

HOME PAGE REQUIREMENTS

The Home page is the main product.

The first screen must immediately answer:

"Are V-Bucks missions available today?"

Layout:

## Top Navigation

Include:

- HawkBucks logo

- HawkBucks name

- Navigation links:

  - Home

  - About

Minimal premium navigation.

------------------------------------------------

## Hero Section

Create a Fortnite inspired hero area.

Content:

Title:

"Save The World"

Subtitle:

"V-Bucks Missions Tracker"

Show current status badge:

Possible states:

1. Missions Available

Example:

"50 V-Bucks Available"

2. No Missions Available

Example:

"No V-Bucks Missions Today"

The status badge should have:

- glowing border

- V-Bucks icon

- animated subtle effect

------------------------------------------------

## Mission Dashboard Section

When missions exist:

Display mission cards.

Each card must include:

Mission Reward:

Example:

50 V-Bucks

Area:

Canny Valley

Mission:

Fight Category 2 Storm

Power Level:

52

Zone:

Desert

Mission card design:

- Glass panel

- Rounded corners

- Neon green border

- Mission icon

- Reward badge

- Power indicator

- Hover animation

The information hierarchy should prioritize:

1. V-Bucks reward

2. Area

3. Mission name

4. Power Level

5. Zone

------------------------------------------------

## Empty State

When no V-Bucks mission exists:

Create an attractive empty state.

Example:

"No V-Bucks Missions Available Today"

"Check again after the next Fortnite reset"

Include:

- V-Bucks icon

- subtle animation

- next update countdown

------------------------------------------------

## Update Information

Show:

Last Updated:

Example:

09 Aug 2026 - 21:30 UTC

Next Update:

Example:

22:00 UTC

Because the backend updates every 30 minutes according to UTC schedule:

00:00

00:30

01:00

01:30

etc.

------------------------------------------------

## About Page

Create a clean About page.

Sections:

1. What is HawkBucks?

Explain:

A community tool that automatically tracks Fortnite Save The World V-Bucks missions.

2. How it works:

Flow:

Epic Games API

↓

Cloudflare Worker

↓

Mission Analysis

↓

HawkBucks Website

3. Features:

- Automatic mission checking

- Real-time updates

- Free access

- Fast mission overview

4. Credits:

HawkBucks Project

------------------------------------------------

# Visual Design Requirements

Follow this exact design direction:

Colors:

Primary:

Neon Emerald Green

Secondary:

Dark Forest Green

Background:

Deep Black / Dark Gaming Theme

Avoid:

- Bright white backgrounds

- Corporate style

- Generic dashboard look

Use:

- Gaming UI

- Esports aesthetic

- Premium futuristic interface

Typography:

Use:

Sora for headings

Inter for body text

Headings:

Bold uppercase style.

------------------------------------------------

# Component Planning

Create reusable React components:

Required components:

Navbar

HeroSection

StatusBadge

MissionDashboard

MissionCard

RewardBadge

PowerBadge

EmptyState

UpdateTimer

Footer

About components:

AboutHero

FeatureCards

HowItWorks

------------------------------------------------

# Technical Requirements

Frontend:

React

Tailwind CSS

Deployment target:

Cloudflare Pages

Requirements:

- Fully responsive

- Mobile first

- Fast loading

- Component based architecture

- Clean reusable code

------------------------------------------------

# UX Requirements

The website should feel like:

"Opening a premium Fortnite command center."

The user should understand the page within 3 seconds.

Avoid unnecessary elements.

The focus is:

Today's V-Bucks Missions.

------------------------------------------------

# Future Ready Considerations

Prepare architecture for future features:

- Telegram bot integration

- Discord notifications

- Multiple languages

- Mission history

- User subscriptions

------------------------------------------------

Output required:

Before coding:

Create:

1. Complete UI layout plan

2. Component hierarchy

3. Page structure

4. Design system

5. Color palette

6. Animation strategy

7. Responsive behavior plan

Do not generate code yet.

Only create the professional frontend design plan.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17d1fce0-e1aa-43c9-be59-446078a35791).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
