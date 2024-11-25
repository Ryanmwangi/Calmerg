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

// Helper function to check if TZID exists in the raw property string
function hasTZID(rawProperty) {
    return rawProperty.includes('TZID=');
}

// Function to process DTSTART/DTEND
function processDateTimeProperty(event, propertyName, newEvent) {
    const rawProperty = event.getFirstProperty(propertyName)?.toICALString();
    if (!rawProperty) {
        console.log(`No raw property found for ${propertyName}`);
        return;
    }

    console.log(`Raw property: ${rawProperty}`);  // Log the raw property

    // Check if it's a date-based event (VALUE=DATE)
    if (rawProperty.includes('VALUE=DATE')) {
        console.log(`Date-based event detected for ${propertyName}: ${rawProperty}`);

        // Split to get the date part (should be in the format YYYYMMDD)
        const dateOnly = rawProperty.split(':')[1]; // e.g., "20231225"
        console.log(`Extracted date string: ${dateOnly}`);

        if (!dateOnly) {
            console.error(`Error: Could not extract date from ${rawProperty}`);
            return;
        }

        // Ensure the date string is valid (no dashes, just YYYYMMDD)
        const year = dateOnly.slice(0, 4);
        const month = dateOnly.slice(4, 6);
        const day = dateOnly.slice(6, 8);

        console.log(`Parsed date: ${year}-${month}-${day}`);

        // Check if the date is valid
        if (!year || !month || !day || isNaN(new Date(`${year}-${month}-${day}`))) {
            console.error(`Invalid date parsed from raw property: ${rawProperty}`);
            return;
        }

        const formattedDate = dateOnly; // Use the date string as is (YYYYMMDD format)
        console.log(`Formatted date: ${formattedDate}`);

        // Log before adding the property to ensure it's correct
        console.log(`Adding date-based property with value: ${propertyName};VALUE=DATE:${formattedDate}`);

        // Correct property name usage (DTSTART not dtstart)
        const property = new ICAL.Property(propertyName.toUpperCase(), newEvent);  // Use uppercase "DTSTART"
        property.setValue(`VALUE=DATE:${formattedDate}`);

        // Log the property object before adding it to ensure everything is correct
        console.log(`Property to add:`, property);

        newEvent.addProperty(property);
    } else {
        console.log(`Time-based event detected for ${propertyName}: ${rawProperty}`);

        // Time-based event processing (existing logic)
        const dateTime = event.getFirstPropertyValue(propertyName);
    const dateTimeString = dateTime.toString();

    const property = new ICAL.Property(propertyName, newEvent);
    property.setValue(dateTimeString);

    if (hasTZID(rawProperty)) {
        // If raw property includes TZID, add it
        property.setParameter('TZID', dateTime.zone.tzid);
    }

    newEvent.addProperty(property);
    }
}


// Create a top-level VCALENDAR component
export function createCalendarComponent(name) {
    const calendarComponent = new ICAL.Component(['vcalendar', [], []]);
    calendarComponent.updatePropertyWithValue('name', name);
    calendarComponent.updatePropertyWithValue('prodid', '-//CalMerge//Calendar Merger 1.0//EN');
    calendarComponent.updatePropertyWithValue('version', '2.0');
    calendarComponent.updatePropertyWithValue('calscale', 'GREGORIAN');
    return calendarComponent;
}

// Add events to the calendar component
export function addEventsToCalendar(calendarComponent, calendars, overrideFlag = false) {
    let defaultTimeZone = null; // To store the first found X-WR-TIMEZONE
    
    calendars.forEach((calendar) => {
        try {
            const parsed = ICAL.parse(calendar.data);
            const component = new ICAL.Component(parsed);
            
            // Extract METHOD from the parsed data (if available)
            const method = component.getFirstPropertyValue('method');
            if (method) {
                console.log(`Extracted METHOD: ${method}`);
                // Only add the METHOD property once
                if (!calendarComponent.getFirstPropertyValue('method')) {
                    calendarComponent.updatePropertyWithValue('method', method.toUpperCase());
                }
            }
            // Extract X-WR-TIMEZONE if available
            const wrTimeZone = component.getFirstPropertyValue('x-wr-timezone');
            if (wrTimeZone) {
                console.log(`Extracted X-WR-TIMEZONE: ${wrTimeZone}`);
                // Set it as the default if not already set
                if (!defaultTimeZone) {
                    defaultTimeZone = wrTimeZone;
                    if (!calendarComponent.getFirstPropertyValue('x-wr-timezone')) {
                        calendarComponent.updatePropertyWithValue('x-wr-timezone', defaultTimeZone);
                    }
                }
            }

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
                const newEvent = new ICAL.Event(newEvent);

                newEvent.startDate = vevent.startDate
                newEvent.endDate = vevent.endDate

                // 3. Copy DTSTAMP
                const dtstamp = event.getFirstPropertyValue('dtstamp');
                if (dtstamp) newEvent.component.updatePropertyWithValue('dtstamp', dtstamp);

                // 4. Copy UID
                newEvent.uid = vevent.uid;

                // 5. Add LOCATION (conditionally included)
                if (overrideFlag) {
                    newEvent.summary = 'Busy'
                } else {
                    newEvent.summary = vevent.summary;
                    if (vevent.location) newEvent.location = vevent.location;
                }

                const rrule = event.getFirstPropertyValue('rrule');
                if (rrule) newEvent.component.updatePropertyWithValue('rrule', rrule);

                // Add the VEVENT to the calendar
                calendarComponent.addSubcomponent(newEvent.component);
            });

            console.log(`Processed VEVENT components for calendar: ${calendar.name}`);
        } catch (error) {
            console.error(`Error processing calendar:`, calendar, error);
        }
    });
}

// Save calendar data to file
export function saveCalendarFile(filename, content) {
    const normalizedContent = content.replace(/\r?\n/g, '\r\n').trimEnd(); // Normalize to CRLF
    const filePath = path.join(MERGED_CALENDARS_DIR, filename);
    console.log(`Saving calendar data to file: ${filePath}`);
    fs.writeFileSync(filePath, normalizedContent);
    return filePath;
}
