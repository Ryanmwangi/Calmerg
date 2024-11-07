import express from 'express';
import ICAL from 'ical.js';
import fs from 'fs';
import axios from 'axios';
import path from 'path';

const app = express();
app.use(express.json());

const MERGED_CALENDARS_DIR = path.join(process.cwd(), 'calendar');
console.log(`Merged calendars directory: ${MERGED_CALENDARS_DIR} under ${process.cwd()}`);

// Ensure the merged calendars directory exists
fs.mkdirSync(MERGED_CALENDARS_DIR, { recursive: true });

// Serve static files
app.get('/script.js', (req, res) => res.sendFile('script.js', { root: '.' }));
app.get('/', (req, res) => res.sendFile('index.html', { root: '.' }));

// Utility to sanitize filenames
const sanitizeFilename = (filename) => filename.replace(/[<>:"/\\|?* ]/g, '_');

// Fetch calendar data from URL or file
const fetchCalendarData = async (calendar) => {
    const isFilePath = !calendar.url.startsWith('http');
    try {
        if (isFilePath) {
            console.log(`Fetching calendar data from file: ${calendar.url}`);
            return {
                data: fs.readFileSync(path.resolve(calendar.url), 'utf-8'),
                ...calendar
            };
        } else {
            console.log(`Fetching calendar data from URL: ${calendar.url}`);
            const response = await axios.get(calendar.url);
            return { data: response.data, ...calendar };
        }
    } catch (error) {
        console.error(`Error retrieving calendar from ${calendar.url}:`, error.message);
        throw error;
    }
};

// Create a top-level VCALENDAR component
const createCalendarComponent = (name) => {
    console.log(`Creating calendar component for: ${name}`);
    const calendarComponent = new ICAL.Component(['vcalendar', [], []]);
    calendarComponent.updatePropertyWithValue('prodid', '-//Your Product ID//EN');
    calendarComponent.updatePropertyWithValue('version', '2.0');
    calendarComponent.updatePropertyWithValue('name', name); // calendar name
    return calendarComponent;
};

// Add events to the calendar component
const addEventsToCalendar = (calendarComponent, results) => {
    console.log(`Adding events to calendar component.`);
    results.forEach((result) => {
        const parsed = ICAL.parse(result.data);
        const component = new ICAL.Component(parsed);

        component.getAllSubcomponents('vevent').forEach((event) => {
            const vevent = new ICAL.Event(event);
            const newEvent = new ICAL.Component('vevent');

            console.log(`Adding event: ${vevent.summary} to calendar.`);
            newEvent.updatePropertyWithValue('uid', vevent.uid);
            newEvent.updatePropertyWithValue('summary', result.override ? result.prefix : `${result.prefix} ${vevent.summary}`);
            newEvent.updatePropertyWithValue('dtstart', vevent.startDate.toICALString());
            newEvent.updatePropertyWithValue('dtend', vevent.endDate.toICALString());

            calendarComponent.addSubcomponent(newEvent);
        });
    });
};

// Save calendar data to file
const saveCalendarFile = (filename, content) => {
    const filePath = path.join(MERGED_CALENDARS_DIR, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
};

// Merge calendars endpoint
app.post('/merge', async (req, res) => {
    const { linkGroupName, calendars } = req.body;

    // Validate the input
    if (!linkGroupName || !Array.isArray(calendars) || calendars.length === 0) {
        return res.status(400).json({ error: 'Invalid input. Please provide a linkGroupName and at least one calendar.' });
    }

    try {
        
        // Sanitize the linkGroupName to create a valid filename
        const sanitizedLinkGroupName = sanitizeFilename(linkGroupName);
        const filename = `${sanitizedLinkGroupName}.ics`;

        // Fetch calendar data
        const results = await Promise.all(calendars.map(fetchCalendarData));
        
        // Generate merged calendar
        const calendarInstance = icalGenerator({ name: linkGroupName });
        mergeCalendarEvents(calendarInstance, results);

        
        // Save the calendar to a file
        saveCalendarFile(filename, calendarInstance.toString());

        // Save the user input and sanitizedLinkGroupName in a separate JSON file
        saveCalendarFile(`${sanitizedLinkGroupName}.json`, JSON.stringify({ linkGroupName, calendars }, null, 2));

        res.json({ url: `${req.protocol}://${req.get('host')}/calendar/${sanitizedLinkGroupName}` });
    } catch (error) {
        console.error('Error merging calendars:', error);
        res.status(500).json({ error: 'Failed to merge calendars' });
    }
});

// Refresh calendar if outdated
const refreshCalendarData = async (calendarName) => {
    const jsonFilePath = path.join(MERGED_CALENDARS_DIR, `${calendarName}.json`);
    
    // Read the JSON file to get the source URL and other details
    const { calendars } = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    const results = await Promise.all(calendars.map(fetchCalendarData));
    const calendarInstance = icalGenerator({ name: calendarName });
    mergeCalendarEvents(calendarInstance, results);

    saveCalendarFile(`${calendarName}.ics`, calendarInstance.toString());
    console.log('Calendar data refreshed.');
};

// Serve the merged calendar file and refresh if older than an hour
app.get('/calendar/:name', async (req, res) => {
    const calendarName = req.params.name;
    const icsFilePath = path.join(MERGED_CALENDARS_DIR, `${calendarName}.ics`);

    try {
        // Check if the .ics file exists
        if (fs.existsSync(icsFilePath)) {
            const stats = fs.statSync(icsFilePath);
            const isOutdated = new Date() - new Date(stats.mtime) > 60 * 60 * 1000;

            if (isOutdated) await refreshCalendarData(calendarName);

            res.setHeader('Content-Type', 'text/calendar');
            res.sendFile(icsFilePath);

        } else {
            res.status(404).json({ error: 'Calendar not found.' });
        }

    } catch (error) {
        console.error('Error retrieving calendar data:', error);
        res.status(500).json({ error: 'Failed to retrieve calendar data.' });
    }
});

export default app;
