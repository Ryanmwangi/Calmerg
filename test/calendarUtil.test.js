import ICAL from '../src/lib/ical.timezones';
import fs from 'fs';
import axios from 'axios';

// Describe the test suite for Calendar Utility Functions
describe('Calendar Utility Functions', () => {
  // Declare variable to hold the functions we will be testing
  let fetchCalendarData;

  beforeAll(async () => {
    const calendarUtilModule = await import('../src/calendarUtil.js');
    fetchCalendarData = calendarUtilModule.fetchCalendarData;
  });

  // Describe a nested test suite for the 'fetchCalendarData' function
  describe('fetchCalendarData', () => {
    
    // Test case: fetching data from a URL
    it('fetches data from a URL', async () => {
      const testCalendar = { url: 'https://calendar.google.com/calendar/ical/b4c66eb4bb2cc15257d071bab3f935385778b042112ea1aaedada47f3f1a6e3a%40group.calendar.google.com/public/basic.ics' };

      // Mock the axios.get method to resolve with specific test data
      jest.spyOn(axios, 'get').mockResolvedValue({ data: 'test data' });

      // Call the fetchCalendarData function with the test calendar object
      const result = await fetchCalendarData(testCalendar);

      // Assert that the fetched result's data matches the expected test data
      expect(result.data).toBe('test data');

      // Restore the original axios.get method after the test
      axios.get.mockRestore();
    });

    // Test case: reading data from a file
    it('reads and parses data from a file', async () => {
      const testCalendar = { url: './test/test_calendars/eat_time_zone_event.ics' };
  
      // Call the fetchCalendarData function
      const result = await fetchCalendarData(testCalendar);
  
      // Expected parsed output
      const expectedParsedData = ICAL.parse(
          fs.readFileSync(testCalendar.url, 'utf-8')
      );
  
      // Assert that the fetched and parsed data matches
      expect(ICAL.parse(result.data)).toEqual(expectedParsedData);
  });
  
    });
});
