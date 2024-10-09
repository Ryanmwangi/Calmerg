**Calendar Merger Project**

**Overview**

The Calendar Merger project is a web application that allows users to merge multiple calendars into a single calendar. The application provides a simple and intuitive interface for users to add calendars, specify prefixes for each calendar, and override the event summaries if desired.

**Features**

Merge multiple calendars into a single calendar
Specify prefixes for each calendar
Override event summaries if desired
Generate a unique URL for the merged calendar
Update the merged calendar every hour using a cron job

**Requirements**

Node.js (version 14 or higher)
Express.js (version 4 or higher)
ical (version 0.7 or higher)
axios (version 0.21 or higher)
cron (version 1.8 or higher)

**Installation**

Clone the repository
Install the dependencies using npm install
Start the server using npm start

**Usage**

Open a web browser and navigate to http://localhost:3000
Click on the "Add Calendar" button to add a new calendar
Enter the calendar URL, prefix, and override options as desired
Click on the "Merge Calendars" button to generate the merged calendar
The merged calendar URL will be displayed on the page

**API Endpoints**

GET /: Returns the index.html file
POST /merge: Merges the calendars and returns the merged calendar URL
GET /:filename: Returns the merged calendar file

**Contributing**

Contributions are welcome! If you'd like to contribute to the project, please fork the repository and submit a pull request.
