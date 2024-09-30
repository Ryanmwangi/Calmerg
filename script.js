const form = document.getElementById('merge-form');
const resultDiv = document.getElementById('result');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cal1Url = document.getElementById('cal1-url').value;
    const cal1Prefix = document.getElementById('cal1-prefix').value;
    const cal2Url = document.getElementById('cal2-url').value;
    const cal2Prefix = document.getElementById('cal2-prefix').value;

    fetch('/merge', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            cal1Url,
            cal1Prefix,
            cal2Url,
            cal2Prefix
        })
    })
    .then(response => response.json())
    .then((data) => {
        resultDiv.innerHTML = `Merged calendar URL: <a href="${data.url}" target="_blank">${data.url}</a>`;
    })
    .catch((error) => {
        console.error(error);
        resultDiv.innerHTML = 'Error merging calendars';
    });
});