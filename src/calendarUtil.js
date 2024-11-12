import ICAL from 'ical.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export const MERGED_CALENDARS_DIR = path.join(process.cwd(), 'calendar');

// Ensure the merged calendars directory exists
fs.mkdirSync(MERGED_CALENDARS_DIR, { recursive: true });

// Utility to sanitize filenames
export const sanitizeFilename = (filename) => filename.replace(/[<>:"/\\|?* ]/g, '_');

// Fetch calendar data from URL or file
export async function fetchCalendarData(calendar) {
    const isFilePath = !calendar.url.startsWith('http');
    try {
        if (isFilePath) {
            return { data: fs.readFileSync(path.resolve(calendar.url), 'utf-8'), ...calendar };
        } else {
            const response = await axios.get(calendar.url);
            return { data: response.data, ...calendar };
        }
    } catch (error) {
        throw new Error(`Error retrieving calendar from ${calendar.url}: ${error.message}`);
    }
}

// Create a top-level VCALENDAR component
export function createCalendarComponent(name) {
    const calendarComponent = new ICAL.Component(['vcalendar', [], []]);
    calendarComponent.updatePropertyWithValue('version', '2.0');
    calendarComponent.updatePropertyWithValue('name', name);
    return calendarComponent;
}

// Add events to the calendar component
export function addEventsToCalendar(calendarComponent, results) {
    results.forEach((result) => {
        try {
            const parsed = ICAL.parse(result.data);
            const component = new ICAL.Component(parsed);

            component.getAllSubcomponents('vevent').forEach((event) => {
                const vevent = new ICAL.Event(event);
                const newEvent = new ICAL.Component('vevent');
                
                // Use ICAL.Time to handle dates correctly
                const startDate = vevent.startDate;
                const endDate = vevent.endDate;

                // Create new ICAL.Time objects for start and end dates
                const startTime = new ICAL.Time();
                startTime.year = startDate.year;
                startTime.month = startDate.month;
                startTime.day = startDate.day;
                startTime.isDate = true; // Set as all-day event

                const endTime = new ICAL.Time();
                endTime.year = endDate.year;
                endTime.month = endDate.month;
                endTime.day = endDate.day;
                endTime.isDate = true; // Set as all-day event

                // Retain the existing DTSTAMP from vevent
                const dtstampProperty = event.getFirstProperty('dtstamp'); // Get DTSTAMP from the original event
                const dtstamp = dtstampProperty ? dtstampProperty.value : null; // Safely get the value

                newEvent.updatePropertyWithValue('uid', vevent.uid);
                newEvent.updatePropertyWithValue('summary', vevent.summary.trim());
                if (dtstamp) {
                    newEvent.updatePropertyWithValue('dtstamp', dtstamp); // Retain the existing DTSTAMP
                }
                
                // Set the dtstart and dtend properties using ICAL.Time
                newEvent.updatePropertyWithValue('dtstart', startTime);
                newEvent.updatePropertyWithValue('dtend', endTime);

                // Add the new event to the calendar component
                calendarComponent.addSubcomponent(newEvent);
            });

            // Log the added events for debugging
            console.log('Added events:', calendarComponent.toString());
        } catch (error) {
            console.error('Error processing calendar data:', error.message);
        }
    });
}

// Save calendar data to file
export function saveCalendarFile(filename, content) {
    const filePath = path.join(MERGED_CALENDARS_DIR, filename);
    console.log(`Saving calendar data to file: ${filePath}`);
    fs.writeFileSync(filePath, content);
    return filePath;
}
