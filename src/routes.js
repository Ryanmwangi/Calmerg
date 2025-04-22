import express from 'express';
import path from 'path';
import fs from 'fs';
import { fetchCalendarData, sanitizeFilename, createCalendarComponent, addEventsToCalendar, saveCalendarFile, MERGED_CALENDARS_DIR } from './calendarUtil.js';

const router = express.Router();

// Merge calendars endpoint
router.post('/merge', async (req, res) => {
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
        
        // Generate merged calendar using ical.js
        const calendarComponent = createCalendarComponent(linkGroupName);
        addEventsToCalendar(calendarComponent, results);
        
        // Save the calendar to a file
        saveCalendarFile(filename, calendarComponent.toString());

        // Save the user input and sanitizedLinkGroupName in a separate JSON file
        saveCalendarFile(`${sanitizedLinkGroupName}.json`, JSON.stringify({ linkGroupName, calendars }, null, 2));

        res.json({ url: `${req.protocol}://${req.get('host')}/calendar/${sanitizedLinkGroupName}` });
    } catch (error) {
        console.error('Error merging calendars:', error.message);
        res.status(500).json({ error: 'Failed to merge calendars' });
    }
});

// Refresh calendar if outdated
async function refreshCalendarData(calendarName) {
    const jsonFilePath = path.join(MERGED_CALENDARS_DIR, `${calendarName}.json`);
    console.log(`Refreshing calendar data for: ${calendarName}`);

    // Read the JSON file to get the source URL and other details
    const { calendars } = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    const calendarResults = await Promise.all(calendars.map(fetchCalendarData));
    const calendarComponent = createCalendarComponent(calendarName);
    addEventsToCalendar(calendarComponent, calendarResults);

    saveCalendarFile(`${calendarName}.ics`, calendarComponent.toString());
    console.log('Calendar data refreshed and saved.');
}

// Serve the merged calendar file and refresh if older than an hour
router.get('/calendar/:name', async (req, res) => {
    // Extract the calendar name and remove .ics extension if present
    let calendarName = req.params.name;
    if (calendarName.endsWith('.ics')) {
        calendarName = calendarName.slice(0, -4);
    }
    
    const icsFilePath = path.join(MERGED_CALENDARS_DIR, `${calendarName}.ics`);

    try {
        // Check if the .ics file exists
        console.log(`Serving calendar for: ${calendarName}`);
        if (fs.existsSync(icsFilePath)) {
            const stats = fs.statSync(icsFilePath);
            const isOutdated = new Date() - new Date(stats.mtime) > 60 * 60 * 1000;

            if (isOutdated){
                console.log(`Calendar ${calendarName} is outdated. Refreshing...`);
                await refreshCalendarData(calendarName);
            }
            res.setHeader('Content-Type', 'text/calendar');
            res.sendFile(icsFilePath);
        } else {
            res.status(404).json({ error: 'Calendar not found.' });
        }
    } catch (error) {
        console.error('Error retrieving calendar data:', error.message);
        res.status(500).json({ error: 'Failed to retrieve calendar data.' });
    }
});

export default router;