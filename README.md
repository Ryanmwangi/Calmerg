# Calendar Merger Project

## Overview

The Calendar Merger project is a web application that allows users to merge multiple calendars into a single calendar. It provides a simple and intuitive interface for users to:

- Add calendars
- Specify prefixes for each calendar
- Override event summaries if desired

The application also generates a unique URL for the merged calendar and updates it every hour using a cron job.

## Features

- Merge multiple calendars into a single calendar
- Specify prefixes for each calendar
- Optionally override event summaries
- Generate a unique URL for the merged calendar
- Automatically update the merged calendar every hour

## Requirements

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (included with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repository-url
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Key Terms

- **Calendar Feed**: A data format that allows users to subscribe to calendar events (e.g., iCalendar `.ics` format).
- **Webcal**: A URL scheme for subscribing to calendar feeds, often used with iCalendar files.
- **CalDAV**: An internet standard for accessing and managing calendar data on remote servers.
- **Prefix**: A string added to the beginning of a calendar feed URL or identifier for organization.
- **Merged Feed**: A single calendar feed combining multiple sources into one unified view.

## Usage

1. Open a web browser and navigate to `http://localhost:3000`.
2. Click the **Add Calendar** button to add a new calendar.
3. Enter the Link Group Name, calendar URL, prefix, and override options (if needed).
4. Click the **Merge Calendars** button to generate the merged calendar.
5. The merged calendar URL will be displayed on the page.

## API Endpoints

- `GET /`: Returns the `index.html` file.
- `POST /merge`: Merges the calendars and returns the merged calendar URL.
- `GET /:filename`: Returns the merged calendar file.

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository.
2. Make your changes.
3. Submit a pull request.

---
