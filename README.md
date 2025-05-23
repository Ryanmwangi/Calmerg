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

## Calender Directory

#### `calendar/` (MERGED_CALENDARS_DIR)
- Location: Created in application's current working directory
- Purpose: Stores all generated calendar files
- Contains:
  - `.ics` files - Final merged calendars in iCalendar format
  - `.json` files - Configuration preserving original merge parameters
  - Maintains both formats for each merged calendar group


## Requirements

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (included with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone git@forge.ftt.gmbh:ryanmwangi/CalMerger.git
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
## Building and Running with Docker

### 1. Build the Docker Image

Run the following command to build the Docker image:

```bash
docker build -t calmerger-app .
```

### 2. Run the Docker Container

To start the container, use:

```bash
docker run -d --name calmerger -p 3012:3012 calmerger-app

```

This maps the container's port `3012` to the host system's port `3012`. The application will be accessible at [http://localhost:3012](http://localhost:3012).

### 3. Using Docker Compose (Optional)

If you prefer to use Docker Compose, ensure you have a `docker-compose.yml` file in your project directory. Then, run:

```bash
docker-compose up -d
```

This will automatically build and start the container based on the configuration in the `docker-compose.yml` file.

### 4. Stopping the Docker Container

To stop the running container, use:

```bash
docker stop calmerger
```

To remove the container:

```bash
docker rm calmerger
```

## Running Tests

This project uses [Jest](https://jestjs.io/) for testing to ensure the Calendar Merger works as expected.

### Run the test suite:

   ```bash
   npm test
   ```

   Jest will automatically locate and execute all test files, providing pass/fail status and error details in your terminal.

For additional insights, you can run tests in coverage mode:

```bash
npm test -- --coverage
```

This generates a `coverage` report, showing how much of the codebase is tested.

## Key Terms

- **Calendar Feed**: A data format that allows users to subscribe to calendar events (e.g., iCalendar `.ics` format).
- **Webcal**: A URL scheme for subscribing to calendar feeds, often used with iCalendar files.
- **CalDAV**: An internet standard for accessing and managing calendar data on remote servers.
- **Prefix**: A string added to the beginning of a calendar feed URL or identifier for organization.
- **Merged Feed**: A single calendar feed combining multiple sources into one unified view.

## Usage

1. Open a web browser and navigate to `http://localhost:3012`.
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
