import ICAL from './lib/ical.timezones.js';
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
    calendarComponent.updatePropertyWithValue('name', name);
    calendarComponent.updatePropertyWithValue('version', '2.0');
    return calendarComponent;
}

// Add events to the calendar component
export function addEventsToCalendar(calendarComponent, results, overrideFlag = false) {
    results.forEach((result) => {
        try {
            const parsed = ICAL.parse(result.data);
            const component = new ICAL.Component(parsed);

            // Extract and add VTIMEZONE components
            const timezones = component.getAllSubcomponents('vtimezone');
            timezones.forEach((timezone) => {
                const tzid = timezone.getFirstPropertyValue('tzid');
                if (!calendarComponent.getFirstSubcomponent((comp) => comp.name === 'vtimezone' && comp.getFirstPropertyValue('tzid') === tzid)) {
                    calendarComponent.addSubcomponent(timezone);
                }
            });
            // Process VEVENT components
            component.getAllSubcomponents('vevent').forEach((event) => {
                const vevent = new ICAL.Event(event);
                const newEvent = new ICAL.Component('vevent');

                // 1. DTEND with time zone
                if (vevent.endDate) {
                    const endTime = vevent.endDate.toString(); // Format end date properly
                    const dtendProp = new ICAL.Property('dtend', newEvent);
                    dtendProp.setValue(endTime);
                
                    // Add TZID parameter if zone is present
                    if (vevent.endDate.zone) {
                        dtendProp.setParameter('TZID', vevent.endDate.zone.tzid);
                    }
                    newEvent.addProperty(dtendProp);
                }

                // 2. Copy DTSTAMP
                const dtstamp = event.getFirstPropertyValue('dtstamp');
                if (dtstamp) newEvent.updatePropertyWithValue('dtstamp', dtstamp);

                 // 3. DTSTART with time zone
                 if (vevent.startDate) {
                    const startTime = vevent.startDate.toString(); // Format start date properly
                    const dtstartProp = new ICAL.Property('dtstart', newEvent);
                    dtstartProp.setValue(startTime);
                
                    // Add TZID parameter if zone is present
                    if (vevent.startDate.zone) {
                        dtstartProp.setParameter('TZID', vevent.startDate.zone.tzid);
                    }
                    newEvent.addProperty(dtstartProp);
                }

                // Add LOCATION (conditionally included)
                if (!overrideFlag && vevent.location) {
                    newEvent.updatePropertyWithValue('location', vevent.location);
                } else if (overrideFlag && vevent.location) {
                    // Modify SUMMARY if override is set
                    const modifiedSummary = `${vevent.summary.trim()} (Location omitted)`;
                    newEvent.updatePropertyWithValue('summary', modifiedSummary);
                } else {
                    newEvent.updatePropertyWithValue('summary', vevent.summary.trim());
                }

                // 5. Copy Recurrence Rules (RRULE) and Recurrence ID
                const rrule = event.getFirstPropertyValue('rrule');
                if (rrule) newEvent.updatePropertyWithValue('rrule', rrule);

                const recurrenceId = event.getFirstPropertyValue('recurrence-id');
                if (recurrenceId) newEvent.updatePropertyWithValue('recurrence-id', recurrenceId);

                // 6. Copy SUMMARY
                newEvent.updatePropertyWithValue('summary', vevent.summary.trim());  

                // 7. Copy UID
                newEvent.updatePropertyWithValue('uid', vevent.uid);
                
                // Add the VEVENT to the calendar
                calendarComponent.addSubcomponent(newEvent);
            });

            console.log(`Processed VEVENT components for calendar: ${result.name}`);
      } catch (error) {
            console.error('Error processing calendar data:', error.message);
        }
    });
}

// Save calendar data to file
export function saveCalendarFile(filename, content) {
    const filePath = path.join(MERGED_CALENDARS_DIR, filename);
    // console.log(`Saving calendar data to file: ${filePath}`);
    fs.writeFileSync(filePath, content);
    return filePath;
}
