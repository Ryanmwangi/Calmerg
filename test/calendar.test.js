import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CALENDARS_DIR = path.join(__dirname, 'calendar');
const TEST_CALENDARS_DIR = path.join(__dirname, 'test_calendars');
const EXPECTED_OUTPUTS_DIR = path.join(__dirname, 'expected_outputs');

let server;
process.chdir(__dirname)
const app = await import('../src/server');

describe('Calendar Merging API', () => {
    beforeAll(async () => {
        // Start the server
        server = app.default.listen(0);
    });

    afterAll(async () => {
        // Ensure the server is closed before cleanup
        await new Promise(resolve => server.close(resolve));

        // Optional: Add a delay to ensure all handles are released
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    const getTestCalendarFilename = (filename) => {
        return path.join(TEST_CALENDARS_DIR, filename);
    };

    const loadExpectedOutput = (filename) => {
        return fs.readFileSync(path.join(EXPECTED_OUTPUTS_DIR, filename), 'utf8');
    };

    test('Preserve nextcloud calendar', async () => {
        const input = getTestCalendarFilename('nextcloud-minimal.ics');
        const response = await request(server)
            .post('/merge')
            .send({
                linkGroupName: 'nextcloud-minimal',
                calendars: [
                    {
                        url: input,
                        prefix: '',
                        override: false,
                    },
                ],
            });
        expect(response.status).toBe(200);
        // Check if the file was created in the test directory
        const filePath = path.join(CALENDARS_DIR, 'nextcloud-minimal.ics');
        console.log('Checking if file exists at:', filePath);
        expect(fs.existsSync(filePath)).toBe(true);

        // Load expected output
        const expectedOutput = fs.readFileSync(input, 'utf8');
        const actualOutput = fs.readFileSync(filePath, 'utf8');
        
        //compare
        expect(actualOutput).toBe(expectedOutput);
    });

    test('Preserve google calendar', async () => {
        const input = getTestCalendarFilename('google-calendar-minimal.ics');
        const response = await request(server)
            .post('/merge')
            .send({
                linkGroupName: 'google-calendar-minimal',
                calendars: [
                    {
                        url: input,
                        prefix: '',
                        override: false,
                    },
                ],
            });
        expect(response.status).toBe(200);
        // Check if the file was created in the test directory
        const filePath = path.join(CALENDARS_DIR, 'google-calendar-minimal.ics');
        console.log('Checking if file exists at:', filePath);
        expect(fs.existsSync(filePath)).toBe(true);

        // Load expected output
        const expectedOutput = fs.readFileSync(input, 'utf8');
        const actualOutput = fs.readFileSync(filePath, 'utf8');
        
        //compare
        expect(actualOutput).toBe(expectedOutput);
    });


    test('Preserve date-based calendar', async () => {
        const input = getTestCalendarFilename('US_Holidays.ics');
        const response = await request(server)
            .post('/merge')
            .send({
                linkGroupName: 'US Holidays',
                calendars: [
                    {
                        url: input,
                        prefix: '',
                        override: false,
                    },
                ],
            });
        expect(response.status).toBe(200);
        // Check if the file was created in the test directory
        const filePath = path.join(CALENDARS_DIR, 'US_Holidays.ics');
        console.log('Checking if file exists at:', filePath);
        expect(fs.existsSync(filePath)).toBe(true);
        // Load expected output and compare
        const expectedOutput = fs.readFileSync(input, 'utf8');
        const actualOutput = fs.readFileSync(filePath, 'utf8');
        expect(actualOutput).toBe(expectedOutput);
    });

    // test('Merge date-based calendar', async () => {
    //     const response = await request(server)
    //         .post('/merge')
    //         .send({
    //             linkGroupName: 'Date Based Calendar',
    //             calendars: [
    //                 {
    //                     url: getTestCalendarFilename('holiday_calendar_2023.ics'),
    //                     prefix: 'holiday_calendar_2023',
    //                     override: false,
    //                 },
    //                 {
    //                     url: getTestCalendarFilename('US_Holidays.ics'),
    //                     prefix: 'US_holidays',
    //                     override: false,
    //                 },
    //             ],
    //         });
    //     expect(response.status).toBe(200);
    //     expect(response.body.url).toMatch(new RegExp(`calendar/Date_Based_Calendar`));

    //     // Check if the file was created in the test directory
    //     const filePath = path.join(CALENDARS_DIR, 'Date_Based_Calendar.ics');
    //     console.log('Checking if file exists at:', filePath);
    //     expect(fs.existsSync(filePath)).toBe(true);

    //     // Load expected output and compare
    //     const expectedOutput = loadExpectedOutput('Date_Based_Calendar.ics');
    //     const actualOutput = fs.readFileSync(filePath, 'utf8');
    //     expect(actualOutput).toBe(expectedOutput);
    // });

    // test('Merge time-based calendar', async () => {
    //     const input = getTestCalendarFilename('work_task_calendar.ics');
    //     const response = await request(server)
    //         .post('/merge')
    //         .send({
    //             linkGroupName: 'Time Based Calendar',
    //             calendars: [
    //                 {
    //                     url: input,
    //                     prefix: 'work_task',
    //                     override: false,
    //                 },
    //             ],
    //         });

    //     expect(response.status).toBe(200);
    //     expect(response.body.url).toMatch(/calendar\/Time_Based_Calendar/);
        
    //     // Check if the file was created in the test directory
    //     const filePath = path.join(CALENDARS_DIR, 'Time_Based_Calendar.ics');
    //     expect(fs.existsSync(filePath)).toBe(true);

    //     // Load expected output and compare
    //     const expectedOutput = fs.readFileSync(input, 'utf8');
    //     const actualOutput = fs.readFileSync(filePath, 'utf8');
    //     expect(actualOutput).toBe(expectedOutput);
    // });

    // test('EAT Event', async () => {
    //     const input = getTestCalendarFilename('eat_time_zone_event.ics');
    //     const response = await request(server)
    //         .post('/merge')
    //         .send({
    //             linkGroupName: 'EAT Event',
    //             calendars: [
    //                 {
    //                     url: input,
    //                     prefix: 'EAT Event',
    //                     override: false,
    //                 },
    //             ],
    //         });

    //     expect(response.status).toBe(200);
    //     expect(response.body.url).toMatch(/calendar\/EAT_Event/);
        
    //     // Check if the file was created in the test directory
    //     const filePath = path.join(CALENDARS_DIR, 'EAT_Event.ics');
    //     expect(fs.existsSync(filePath)).toBe(true);

    //     // Load expected output and compare
    //     const expectedOutput = fs.readFileSync(input, 'utf8');
    //     const actualOutput = fs.readFileSync(filePath, 'utf8');
    //     expect(actualOutput).toBe(expectedOutput);
    // });

    // test('Merge calendar without prefix', async () => {
    //     const response = await request(server)
    //         .post('/merge')
    //         .send({
    //             linkGroupName: 'No Prefix Calendar',
    //             calendars: [
    //                 {
    //                     url: getTestCalendarFilename('sf_public_holidays.ics'),
    //                     prefix: '',
    //                     override: false,
    //                 },
    //             ],
    //         });

    //     expect(response.status).toBe(200);
    //     expect(response.body.url).toMatch(/calendar\/No_Prefix_Calendar/);
        
    //     // Check if the file was created in the test directory
    //     const filePath = path.join(CALENDARS_DIR, 'No_Prefix_Calendar.ics');
    //     expect(fs.existsSync(filePath)).toBe(true);

    //     // Load expected output and compare
    //     const expectedOutput = loadExpectedOutput('No_Prefix_Calendar.ics');
    //     const actualOutput = fs.readFileSync(filePath, 'utf8');
    //     expect(actualOutput).toBe(expectedOutput);
    // });
    
    // test('Merge calendar with override', async () => {
    //     const response = await request(server)
    //         .post('/merge')
    //         .send({
    //             linkGroupName: 'Override Calendar',
    //             calendars: [
    //                 {
    //                     url: getTestCalendarFilename('sf_public_holidays.ics'),
    //                     prefix: 'Override Event',
    //                     override: true,
    //                 },
    //             ],
    //         });

    //     expect(response.status).toBe(200);
    //     expect(response.body.url).toMatch(/calendar\/Override_Calendar/);
        
    //     // Check if the file was created in the test directory
    //     const filePath = path.join(CALENDARS_DIR, 'Override_Calendar.ics');
    //     expect(fs.existsSync(filePath)).toBe(true);

    //     // Load expected output and compare
    //     const expectedOutput = loadExpectedOutput('Override_Calendar.ics');
    //     const actualOutput = fs.readFileSync(filePath, 'utf8');
    //     expect(actualOutput).toBe(expectedOutput);
    // });

    // test('Merge UTC and EAT time zone calendar', async () => {
    //     const response = await request(server)
    //         .post('/merge')
    //         .send({
    //             linkGroupName: 'UTCEAT Time Zone Calendar',
    //             calendars: [
    //                 {
    //                     url: getTestCalendarFilename('utc_time_zone_event.ics'),
    //                     prefix: 'UTC_Event',
    //                     override: false,
    //                 },
    //                 {
    //                     url: getTestCalendarFilename('eat_time_zone_event.ics'),
    //                     prefix: 'EAT_Event',
    //                     override: false,
    //                 },
    //             ],
    //         });
    //     expect(response.status).toBe(200);
    //     expect(response.body.url).toMatch(new RegExp(`calendar/UTCEAT_Time_Zone_Calendar`));

    //     // Check if the file was created in the test directory
    //     const filePath = path.join(CALENDARS_DIR, 'UTCEAT_Time_Zone_Calendar.ics');
    //     expect(fs.existsSync(filePath)).toBe(true);

    //     // Load expected output and compare
    //     const expectedOutput = loadExpectedOutput('UTCEAT_Time_Zone_Calendar.ics');
    //     const actualOutput = fs.readFileSync(filePath, 'utf8');
    //     expect(actualOutput).toBe(expectedOutput);
    // });

    // test('Merge date-based and time-based calendars', async () => {
    // const response = await request(server)
    //     .post('/merge')
    //     .send({
    //         linkGroupName: 'Merged Date and Time Based Calendar',
    //         calendars: [
    //             {
    //                 url: getTestCalendarFilename('holiday_calendar_2023.ics'), // Date-based calendar
    //                 prefix: 'Holiday_2023',
    //                 override: false,
    //             },
    //             {
    //                 url: getTestCalendarFilename('work_task_calendar.ics'), // Time-based calendar
    //                 prefix: 'Work_Task',
    //                 override: false,
    //             },
    //         ],
    //     });

    // expect(response.status).toBe(200);
    // expect(response.body.url).toMatch(new RegExp('calendar/Merged_Date_and_Time_Based_Calendar'));

    // // Check if the file was created in the test directory
    // const filePath = path.join(CALENDARS_DIR, 'Merged_Date_and_Time_Based_Calendar.ics');
    // expect(fs.existsSync(filePath)).toBe(true);

    // // Load expected output and compare
    // const expectedOutput = loadExpectedOutput('Merged_Date_and_Time_Based_Calendar.ics');
    // const actualOutput = fs.readFileSync(filePath, 'utf8');
    // expect(actualOutput).toBe(expectedOutput);
    // });

});
