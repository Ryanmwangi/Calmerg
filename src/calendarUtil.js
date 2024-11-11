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
    calendarComponent.updatePropertyWithValue('prodid', '-//Your Product ID//EN');
    calendarComponent.updatePropertyWithValue('version', '2.0');
    calendarComponent.updatePropertyWithValue('name', name);
    return calendarComponent;
}

// Add events to the calendar component
export function addEventsToCalendar(calendarComponent, results) {
    results.forEach((result) => {
        const parsed = ICAL.parse(result.data);
        const component = new ICAL.Component(parsed);

        component.getAllSubcomponents('vevent').forEach((event) => {
            const vevent = new ICAL.Event(event);
            const newEvent = new ICAL.Component('vevent');

            const startDate = vevent.startDate && ICAL.Time.fromJSDate(vevent.startDate.toJSDate());
            const endDate = vevent.endDate && ICAL.Time.fromJSDate(vevent.endDate.toJSDate());

            newEvent.updatePropertyWithValue('uid', vevent.uid);
            newEvent.updatePropertyWithValue('summary', `${result.prefix} ${vevent.summary}`);
            newEvent.updatePropertyWithValue('dtstart', startDate);
            newEvent.updatePropertyWithValue('dtend', endDate);

            calendarComponent.addSubcomponent(newEvent);
        });
    });
}

// Save calendar data to file
export function saveCalendarFile(filename, content) {
    const filePath = path.join(MERGED_CALENDARS_DIR, filename);
    console.log(`Saving calendar data to file: ${filePath}`);
    fs.writeFileSync(filePath, content);
    return filePath;
}
