import request from 'supertest';
import express from 'express';
import icalGenerator from 'ical-generator';
import fs from 'fs';
import path from 'path';

const MERGED_CALENDARS_DIR = 'calendar';

describe('Calendar Merging API', () => {
    beforeAll(() => {
        // Ensure the merged calendars directory exists
        if (!fs.existsSync(MERGED_CALENDARS_DIR)) {
            fs.mkdirSync(MERGED_CALENDARS_DIR);
        }
    });
    afterAll(() => {
        // Clean up the merged calendars directory after tests
        fs.rmdirSync(MERGED_CALENDARS_DIR, { recursive: true });
    });

    test('Merge date-based calendar', async () => {
        
    })

});