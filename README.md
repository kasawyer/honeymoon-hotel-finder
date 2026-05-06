# Honeymoon Hotel Finder

A web app that aggregates hotel results from Google Maps, Booking.com, TripAdvisor,
and Expedia — filtered for romantic, honeymoon, and anniversary keywords.

## Tech Stack

- **Backend:** Ruby on Rails 7.1 (API mode) + PostgreSQL
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Hosting:** Heroku
- **APIs:** Google Places, Booking.com (RapidAPI), TripAdvisor (RapidAPI), Hotels.com (RapidAPI)

## Local Development

### Prerequisites
- Ruby 3.2+
- Node.js 18+
- PostgreSQL 14+

### Setup
```sh
# Backend
cd backend
cp .env.example .env   # Fill in your API keys
bundle install
rails db:create db:migrate
rails server -p 3001

# Frontend (separate terminal)
cd frontend
cp .env.example .env   # Fill in your API keys
npm install
npm run dev
```

Visit http://localhost:5173

![CI](https://github.com/kasawyer/honeymoon-hotel-finder/actions/workflows/ci.yml/badge.svg?branch=master)
[![Maintainability](https://qlty.sh/gh/kasawyer/projects/honeymoon-hotel-finder/maintainability.svg)](https://qlty.sh/gh/kasawyer/projects/honeymoon-hotel-finder)
[![codecov](https://codecov.io/gh/kasawyer/honeymoon-hotel-finder/branch/master/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/kasawyer/honeymoon-hotel-finder)